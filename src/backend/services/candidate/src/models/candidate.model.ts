/**
 * @fileoverview TypeORM entity model for candidate data in the RefactorTrack ATS system.
 * Implements secure, GDPR-compliant database schema with comprehensive validation and auditing.
 * @version 1.0.0
 * @package RefactorTrack
 */

import { 
  Entity, 
  Column, 
  Index, 
  OneToMany, 
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad
} from 'typeorm'; // ^0.3.17
import { z } from 'zod'; // ^3.0.0
import { ICandidate, CandidateStatus, candidateSchema } from '../interfaces/candidate.interface';
import { encrypt, decrypt } from '../utils/encryption.util';
import { maskData } from '../utils/data-masking.util';
import { auditLog } from '../utils/audit-logging.util';
import { UserRole } from '../../../shared/types/auth.types';

/**
 * TypeORM entity for managing candidate data with comprehensive security and GDPR compliance
 */
@Entity('candidates')
@Index(['email'], { unique: true })
@Index(['status', 'created_at'])
@Index(['last_name', 'first_name'])
export class Candidate extends BaseEntity implements ICandidate {
  // Personal Information (GDPR-sensitive)
  @Column({ length: 50 })
  first_name: string;

  @Column({ length: 50 })
  last_name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 20 })
  phone: string;

  // Professional Details
  @Column({
    type: 'enum',
    enum: CandidateStatus,
    default: CandidateStatus.ACTIVE
  })
  status: CandidateStatus;

  @Column({ type: 'jsonb', nullable: true })
  skills: ICandidateSkill[];

  @Column({ type: 'jsonb', nullable: true })
  experience: IWorkExperience[];

  @Column({ type: 'jsonb', nullable: true })
  education: IEducation[];

  // Documents and Media
  @Column({ length: 500 })
  resume_url: string;

  @Column({ length: 500, nullable: true })
  profile_picture_url?: string;

  @Column({ length: 500, nullable: true })
  portfolio_url?: string;

  // Preferences and Availability
  @Column({ length: 100 })
  preferred_location: string;

  @Column()
  willing_to_relocate: boolean;

  @Column({
    type: 'enum',
    enum: ['REMOTE', 'HYBRID', 'ONSITE']
  })
  remote_work_preference: 'REMOTE' | 'HYBRID' | 'ONSITE';

  @Column({ type: 'timestamp with time zone' })
  availability_date: Date;

  @Column({ type: 'jsonb' })
  salary_expectations: ISalaryExpectation;

  // GDPR Compliance
  @Column()
  gdpr_consent: boolean;

  @Column({ type: 'timestamp with time zone' })
  data_retention_date: Date;

  @Column()
  marketing_consent: boolean;

  @Column({ type: 'timestamp with time zone' })
  last_consent_date: Date;

  // System Fields
  @Column({ length: 100 })
  source: string;

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column('text', { array: true, default: [] })
  notes: string[];

  @Column({ type: 'timestamp with time zone' })
  last_activity_date: Date;

  // Sensitive Data (Encrypted)
  @Column({ type: 'text', nullable: true })
  private encrypted_ssn: string;

  // Audit Fields
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @VersionColumn()
  version: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  /**
   * Creates a new candidate instance with comprehensive validation
   * @param candidateData - Partial candidate data for initialization
   */
  constructor(candidateData: Partial<ICandidate>) {
    super();
    if (candidateData) {
      // Validate input data
      const validatedData = candidateSchema.parse(candidateData);

      // Initialize base properties
      Object.assign(this, validatedData);

      // Initialize arrays
      this.skills = this.skills || [];
      this.experience = this.experience || [];
      this.education = this.education || [];
      this.tags = this.tags || [];
      this.notes = this.notes || [];

      // Set GDPR-related fields
      this.gdpr_consent = validatedData.gdpr_consent || false;
      this.last_consent_date = new Date();
      this.data_retention_date = new Date();
      this.data_retention_date.setFullYear(this.data_retention_date.getFullYear() + 2);

      // Set system fields
      this.last_activity_date = new Date();
      this.status = validatedData.status || CandidateStatus.ACTIVE;
    }
  }

  /**
   * Lifecycle hook to handle data encryption before insert
   */
  @BeforeInsert()
  protected async beforeInsert(): Promise<void> {
    await this.encryptSensitiveData();
    await auditLog('candidate_created', this.id, {
      email: this.email,
      status: this.status
    });
  }

  /**
   * Lifecycle hook to handle data encryption before update
   */
  @BeforeUpdate()
  protected async beforeUpdate(): Promise<void> {
    await this.encryptSensitiveData();
    await auditLog('candidate_updated', this.id, {
      email: this.email,
      status: this.status
    });
  }

  /**
   * Lifecycle hook to handle data decryption after load
   */
  @AfterLoad()
  protected async afterLoad(): Promise<void> {
    await this.decryptSensitiveData();
  }

  /**
   * Encrypts sensitive candidate data
   */
  private async encryptSensitiveData(): Promise<void> {
    if (this.encrypted_ssn) {
      this.encrypted_ssn = await encrypt(this.encrypted_ssn);
    }
  }

  /**
   * Decrypts sensitive candidate data
   */
  private async decryptSensitiveData(): Promise<void> {
    if (this.encrypted_ssn) {
      this.encrypted_ssn = await decrypt(this.encrypted_ssn);
    }
  }

  /**
   * Converts candidate entity to JSON with role-based data masking
   * @param userRole - Role of the requesting user
   * @returns Masked candidate data based on user role
   */
  public toJSON(userRole: UserRole): Record<string, any> {
    const baseObject = {
      ...this,
      encrypted_ssn: undefined // Remove sensitive data
    };

    // Apply role-based data masking
    return maskData(baseObject, userRole, {
      email: ['RECRUITER', 'ADMIN'],
      phone: ['RECRUITER', 'ADMIN'],
      salary_expectations: ['RECRUITER', 'ADMIN']
    });
  }

  /**
   * Updates candidate data with validation and audit logging
   * @param updateData - Partial candidate data to update
   * @returns Updated candidate instance
   */
  public async validateAndUpdate(updateData: Partial<ICandidate>): Promise<Candidate> {
    // Validate update data
    const validatedData = candidateSchema.partial().parse(updateData);

    // Check for sensitive field changes
    const sensitiveFieldsChanged = this.checkSensitiveFieldChanges(validatedData);

    // Apply updates
    Object.assign(this, validatedData);

    // Update activity timestamp
    this.last_activity_date = new Date();

    // Log sensitive changes
    if (sensitiveFieldsChanged) {
      await auditLog('sensitive_data_updated', this.id, {
        fields: Object.keys(validatedData)
      });
    }

    return this.save();
  }

  /**
   * Checks if sensitive fields are being modified
   * @param updateData - Data being updated
   * @returns Boolean indicating if sensitive fields changed
   */
  private checkSensitiveFieldChanges(updateData: Partial<ICandidate>): boolean {
    const sensitiveFields = ['email', 'phone', 'encrypted_ssn'];
    return sensitiveFields.some(field => field in updateData);
  }
}

export default Candidate;