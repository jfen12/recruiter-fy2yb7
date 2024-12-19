/**
 * @fileoverview TypeORM entity model for candidate skills in the RefactorTrack ATS system.
 * Implements comprehensive database schema for storing and managing technical skills.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index
} from 'typeorm'; // ^0.3.17

import { 
  ISkill, 
  SkillCategory, 
  SkillProficiency 
} from '../interfaces/skill.interface';

/**
 * TypeORM entity class for managing candidate skill information
 * Implements comprehensive skill tracking with advanced querying capabilities
 */
@Entity('skills')
@Index(['name', 'category']) // Optimize skill search queries
@Index(['proficiency_level', 'years_of_experience']) // Optimize matching queries
export class Skill implements ISkill {
  /**
   * Unique identifier for the skill record
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Name of the technical skill (e.g., Java, Python, AWS)
   */
  @Column({ 
    type: 'varchar', 
    length: 100, 
    nullable: false 
  })
  name: string;

  /**
   * Category classification of the skill
   */
  @Column({ 
    type: 'enum', 
    enum: SkillCategory,
    nullable: false
  })
  category: SkillCategory;

  /**
   * Total years of experience with the skill
   */
  @Column({ 
    type: 'decimal',
    precision: 4,
    scale: 1,
    nullable: false,
    default: 0
  })
  years_of_experience: number;

  /**
   * Current assessed proficiency level
   */
  @Column({
    type: 'enum',
    enum: SkillProficiency,
    nullable: false,
    default: SkillProficiency.BEGINNER
  })
  proficiency_level: SkillProficiency;

  /**
   * Most recent date the skill was actively used
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP'
  })
  last_used_date: Date;

  /**
   * Indicates if this is a primary/core skill for the candidate
   */
  @Column({
    type: 'boolean',
    default: false
  })
  is_primary: boolean;

  /**
   * Array of related certifications validating this skill
   */
  @Column({
    type: 'text',
    array: true,
    nullable: true,
    default: []
  })
  certifications: string[];

  /**
   * Timestamp of record creation
   */
  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at'
  })
  created_at: Date;

  /**
   * Timestamp of last record update
   */
  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at'
  })
  updated_at: Date;

  /**
   * Creates a new Skill instance with comprehensive validation
   * @param partial - Partial skill data to initialize the entity
   */
  constructor(partial: Partial<ISkill>) {
    if (partial) {
      // Validate and assign provided skill properties
      Object.assign(this, partial);

      // Ensure valid years of experience
      if (this.years_of_experience < 0) {
        this.years_of_experience = 0;
      }

      // Set default last used date if not provided
      if (!this.last_used_date) {
        this.last_used_date = new Date();
      }

      // Initialize empty certifications array if not provided
      if (!this.certifications) {
        this.certifications = [];
      }

      // Validate certification format if provided
      this.certifications = this.certifications.map(cert => cert.trim()).filter(cert => cert.length > 0);
    }
  }
}