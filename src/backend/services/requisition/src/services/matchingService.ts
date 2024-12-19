/**
 * @fileoverview Service responsible for intelligent candidate-requisition matching
 * Implements advanced algorithms and Elasticsearch for improved requisition fulfillment
 * @version 1.0.0
 * @package RefactorTrack
 */

import { Client } from '@elastic/elasticsearch'; // v8.0.0
import { Logger } from 'winston'; // v3.8.0
import Redis from 'ioredis'; // v5.0.0
import { injectable, inject } from 'inversify'; // v6.0.0
import { Requisition, RequiredSkill } from '../interfaces/requisition.interface';
import { CandidateSchema } from '../../../shared/schemas/candidate.schema';
import { validateRequisition } from '../utils/validation';

/**
 * Interface for match weighting configuration
 */
interface MatchWeights {
  skillMatch: number;
  experienceLevel: number;
  mandatorySkills: number;
  locationMatch: number;
  availability: number;
}

/**
 * Interface for matching options
 */
interface MatchOptions {
  minimumScore: number;
  maxResults: number;
  includeInactive: boolean;
  sortBy: string[];
  weightings: MatchWeights;
  fuzzyMatching: boolean;
  cacheResults: boolean;
  timeout: number;
}

/**
 * Interface for skill match details
 */
interface SkillMatch {
  skillId: string;
  name: string;
  required: boolean;
  score: number;
  yearsDelta: number;
  levelDelta: number;
}

/**
 * Interface for match results
 */
interface MatchResult {
  candidateId: string;
  score: number;
  skillMatches: SkillMatch[];
  experienceMatch: number;
  availabilityMatch: boolean;
  locationMatch: number;
  lastUpdated: Date;
  confidence: number;
}

/**
 * Default match weights configuration
 */
const DEFAULT_WEIGHTS: MatchWeights = {
  skillMatch: 0.4,
  experienceLevel: 0.2,
  mandatorySkills: 0.2,
  locationMatch: 0.1,
  availability: 0.1
};

/**
 * Service class implementing intelligent candidate-requisition matching
 */
@injectable()
export class MatchingService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;
  private readonly INDEX_NAME = 'candidates';

  constructor(
    @inject('ElasticsearchClient') private elasticClient: Client,
    @inject('Logger') private logger: Logger,
    @inject('RedisClient') private cache: Redis,
    @inject('Config') private config: any
  ) {}

  /**
   * Finds matching candidates for a given requisition
   * @param requisition - The job requisition to match against
   * @param options - Matching configuration options
   * @returns Array of matched candidates with scores
   */
  public async findMatchingCandidates(
    requisition: Requisition,
    options: Partial<MatchOptions> = {}
  ): Promise<MatchResult[]> {
    try {
      // Validate requisition data
      await validateRequisition(requisition);

      // Check cache if enabled
      const cacheKey = this.generateCacheKey(requisition, options);
      if (options.cacheResults) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Build Elasticsearch query
      const query = this.buildMatchQuery(requisition, options);
      
      // Execute search with retries
      const searchResult = await this.executeSearchWithRetry(query, options.timeout);

      // Process and score results
      const matches = await this.processSearchResults(searchResult, requisition, options);

      // Cache results if enabled
      if (options.cacheResults) {
        await this.cache.setex(cacheKey, this.CACHE_TTL, JSON.stringify(matches));
      }

      return matches;
    } catch (error) {
      this.logger.error('Error in findMatchingCandidates:', error);
      throw error;
    }
  }

  /**
   * Calculates detailed skill match scores
   * @param requiredSkills - Skills required by the requisition
   * @param candidateSkills - Candidate's skills
   * @returns Detailed skill matching score
   */
  private calculateSkillMatch(
    requiredSkills: RequiredSkill[],
    candidateSkills: any[]
  ): SkillMatch[] {
    return requiredSkills.map(required => {
      const candidateSkill = candidateSkills.find(cs => cs.skill_id === required.skill_id);
      
      if (!candidateSkill) {
        return {
          skillId: required.skill_id,
          name: required.skill_name,
          required: required.is_mandatory,
          score: 0,
          yearsDelta: -required.minimum_years,
          levelDelta: -4 // Maximum level difference
        };
      }

      // Calculate years experience delta
      const yearsDelta = candidateSkill.years - required.minimum_years;
      
      // Calculate skill level delta
      const levelMap = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
      const levelDelta = levelMap[candidateSkill.level] - levelMap[required.required_level];

      // Calculate composite score
      const score = this.calculateCompositeSkillScore(yearsDelta, levelDelta, required.is_mandatory);

      return {
        skillId: required.skill_id,
        name: required.skill_name,
        required: required.is_mandatory,
        score,
        yearsDelta,
        levelDelta
      };
    });
  }

  /**
   * Builds Elasticsearch match query
   * @param requisition - The requisition to match
   * @param options - Match options
   * @returns Elasticsearch query object
   */
  private buildMatchQuery(requisition: Requisition, options: Partial<MatchOptions>): any {
    const must: any[] = [
      { term: { status: 'ACTIVE' } }
    ];

    // Add skill requirements
    const skillQueries = requisition.required_skills.map(skill => ({
      nested: {
        path: 'skills',
        query: {
          bool: {
            must: [
              { term: { 'skills.skill_id': skill.skill_id } },
              { range: { 'skills.years': { gte: skill.minimum_years } } }
            ]
          }
        }
      }
    }));

    must.push(...skillQueries);

    // Add location matching if specified
    if (requisition.location) {
      must.push({
        bool: {
          should: [
            { term: { 'location.remote_allowed': true } },
            {
              bool: {
                must: [
                  { term: { 'location.city': requisition.location.city } },
                  { term: { 'location.state': requisition.location.state } }
                ]
              }
            }
          ]
        }
      });
    }

    return {
      query: {
        bool: {
          must,
          should: this.buildShouldClauses(requisition, options)
        }
      },
      size: options.maxResults || 100,
      _source: true
    };
  }

  /**
   * Executes Elasticsearch search with retry logic
   * @param query - Elasticsearch query
   * @param timeout - Search timeout in ms
   * @returns Search results
   */
  private async executeSearchWithRetry(query: any, timeout?: number): Promise<any> {
    let lastError;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.elasticClient.search({
          index: this.INDEX_NAME,
          body: query,
          timeout: timeout ? `${timeout}ms` : '30s'
        });
      } catch (error) {
        lastError = error;
        this.logger.warn(`Search attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Processes and scores search results
   * @param searchResult - Elasticsearch search results
   * @param requisition - Original requisition
   * @param options - Match options
   * @returns Processed and scored matches
   */
  private async processSearchResults(
    searchResult: any,
    requisition: Requisition,
    options: Partial<MatchOptions>
  ): Promise<MatchResult[]> {
    const weights = { ...DEFAULT_WEIGHTS, ...options.weightings };
    
    return searchResult.hits.hits.map((hit: any) => {
      const candidate = hit._source;
      const skillMatches = this.calculateSkillMatch(requisition.required_skills, candidate.skills);
      
      // Calculate component scores
      const skillScore = this.calculateOverallSkillScore(skillMatches, weights);
      const locationScore = this.calculateLocationScore(requisition, candidate);
      const availabilityScore = candidate.status === 'ACTIVE' ? 1 : 0;

      // Calculate final score
      const score = (
        skillScore * weights.skillMatch +
        locationScore * weights.locationMatch +
        availabilityScore * weights.availability
      );

      return {
        candidateId: candidate.id,
        score,
        skillMatches,
        experienceMatch: skillScore,
        availabilityMatch: availabilityScore === 1,
        locationMatch: locationScore,
        lastUpdated: new Date(candidate.updated_at),
        confidence: this.calculateConfidenceScore(skillMatches, score)
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Generates cache key for results caching
   * @param requisition - Requisition data
   * @param options - Match options
   * @returns Cache key string
   */
  private generateCacheKey(requisition: Requisition, options: Partial<MatchOptions>): string {
    const key = {
      reqId: requisition.id,
      skills: requisition.required_skills.map(s => s.skill_id).sort(),
      opts: options
    };
    return `match:${Buffer.from(JSON.stringify(key)).toString('base64')}`;
  }

  /**
   * Calculates composite skill score
   * @param yearsDelta - Years of experience difference
   * @param levelDelta - Skill level difference
   * @param isMandatory - Whether skill is mandatory
   * @returns Composite score
   */
  private calculateCompositeSkillScore(
    yearsDelta: number,
    levelDelta: number,
    isMandatory: boolean
  ): number {
    const yearsScore = Math.min(Math.max(yearsDelta / 5 + 0.5, 0), 1);
    const levelScore = Math.min(Math.max(levelDelta / 4 + 0.5, 0), 1);
    const weight = isMandatory ? 1.5 : 1;
    
    return (yearsScore * 0.6 + levelScore * 0.4) * weight;
  }

  /**
   * Calculates overall skill score
   * @param skillMatches - Array of skill matches
   * @param weights - Scoring weights
   * @returns Overall skill score
   */
  private calculateOverallSkillScore(skillMatches: SkillMatch[], weights: MatchWeights): number {
    const mandatorySkills = skillMatches.filter(s => s.required);
    const optionalSkills = skillMatches.filter(s => !s.required);

    const mandatoryScore = mandatorySkills.reduce((sum, s) => sum + s.score, 0) / 
      (mandatorySkills.length || 1);
    const optionalScore = optionalSkills.reduce((sum, s) => sum + s.score, 0) / 
      (optionalSkills.length || 1);

    return (
      mandatoryScore * weights.mandatorySkills +
      optionalScore * (1 - weights.mandatorySkills)
    );
  }

  /**
   * Calculates location match score
   * @param requisition - Requisition data
   * @param candidate - Candidate data
   * @returns Location match score
   */
  private calculateLocationScore(requisition: Requisition, candidate: any): number {
    if (candidate.location.remote_allowed && requisition.location.remote_allowed) {
      return 1;
    }

    if (
      candidate.location.city === requisition.location.city &&
      candidate.location.state === requisition.location.state
    ) {
      return 1;
    }

    return 0;
  }

  /**
   * Calculates confidence score for match
   * @param skillMatches - Array of skill matches
   * @param overallScore - Overall match score
   * @returns Confidence score
   */
  private calculateConfidenceScore(skillMatches: SkillMatch[], overallScore: number): number {
    const mandatoryMatches = skillMatches.filter(s => s.required && s.score > 0).length;
    const totalMandatory = skillMatches.filter(s => s.required).length;
    
    const mandatoryRatio = mandatoryMatches / totalMandatory;
    return Math.min(overallScore * mandatoryRatio * 1.2, 1);
  }
}