/**
 * @fileoverview TypeORM entity model for job requisitions with enhanced validation and GDPR compliance
 * @version 1.0.0
 * @package RefactorTrack
 */

import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany
} from 'typeorm'; // v0.3.17

import { BaseEntity } from '../../../shared/types/common.types';
import { 
  Requisition, 
  RequisitionStatus, 
  RequiredSkill 
} from '../interfaces/requisition.interface';
import { RequisitionSchema } from '../../../shared/schemas/requisition.schema';

/**
 * Data classification levels for GDPR compliance
 */
enum DataClassification {
  CONFIDENTIAL = 'CONFIDENTIAL',
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC'
}

/**
 * TypeORM entity model for job requisitions
 * Implements comprehensive validation and GDPR compliance
 */
@Entity('requisitions')
export class RequisitionModel implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'uuid', nullable: false })
  client_id: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({ type: 'jsonb', nullable: false })
  required_skills: RequiredSkill[];

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    default: RequisitionStatus.DRAFT
  })
  status: RequisitionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  rate: number;

  @Column({ type: 'timestamp', nullable: false })
  deadline: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ 
    type: 'timestamp', 
    nullable: true,
    comment: 'Date when data should be reviewed for retention'
  })
  retention_date: Date;

  @Column({ 
    type: 'boolean', 
    default: false,
    comment: 'Indicates if record is archived for GDPR compliance'
  })
  is_archived: boolean;

  @Column({
    type: 'enum',
    enum: DataClassification,
    default: DataClassification.CONFIDENTIAL,
    comment: 'Data classification level for GDPR compliance'
  })
  data_classification: DataClassification;

  /**
   * Creates a new requisition instance with GDPR compliance fields
   * @param data - Partial requisition data
   */
  constructor(data?: Partial<Requisition>) {
    if (data) {
      Object.assign(this, data);
      this.status = data.status || RequisitionStatus.DRAFT;
      this.created_at = new Date();
      this.updated_at = new Date();
      
      // Set data classification and retention period
      this.data_classification = DataClassification.CONFIDENTIAL;
      this.retention_date = new Date();
      this.retention_date.setFullYear(this.retention_date.getFullYear() + 2); // 2 year retention
      
      this.is_archived = false;
    }
  }

  /**
   * Validates requisition data with enhanced business rules
   * @throws Error if validation fails
   * @returns Promise<boolean>
   */
  async validate(): Promise<boolean> {
    try {
      // Basic schema validation
      const validationResult = RequisitionSchema.safeParse({
        title: this.title,
        description: this.description,
        client_id: this.client_id,
        rate: this.rate,
        deadline: this.deadline,
        required_skills: this.required_skills
      });

      if (!validationResult.success) {
        throw new Error(`Validation failed: ${validationResult.error.message}`);
      }

      // Enhanced business rule validation
      if (this.required_skills.length < 1) {
        throw new Error('At least one required skill must be specified');
      }

      if (this.rate <= 0 || this.rate > 1000000) {
        throw new Error('Rate must be between 0 and 1,000,000');
      }

      const now = new Date();
      if (this.deadline <= now) {
        throw new Error('Deadline must be in the future');
      }

      // Maximum deadline is 1 year from now
      const maxDeadline = new Date();
      maxDeadline.setFullYear(maxDeadline.getFullYear() + 1);
      if (this.deadline > maxDeadline) {
        throw new Error('Deadline cannot be more than 1 year in the future');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates requisition status with validation and audit logging
   * @param newStatus - New status to set
   * @throws Error if status transition is invalid
   */
  async updateStatus(newStatus: RequisitionStatus): Promise<void> {
    // Validate status transition
    const validTransitions = {
      [RequisitionStatus.DRAFT]: [RequisitionStatus.OPEN, RequisitionStatus.CANCELLED],
      [RequisitionStatus.OPEN]: [RequisitionStatus.IN_PROGRESS, RequisitionStatus.ON_HOLD, RequisitionStatus.CANCELLED],
      [RequisitionStatus.IN_PROGRESS]: [RequisitionStatus.OPEN, RequisitionStatus.CLOSED, RequisitionStatus.ON_HOLD],
      [RequisitionStatus.ON_HOLD]: [RequisitionStatus.OPEN, RequisitionStatus.CANCELLED],
      [RequisitionStatus.CLOSED]: [RequisitionStatus.CANCELLED],
      [RequisitionStatus.CANCELLED]: []
    };

    if (!validTransitions[this.status].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
    }

    this.status = newStatus;
    this.updated_at = new Date();
  }

  /**
   * Manages data retention according to GDPR policies
   * @throws Error if retention handling fails
   */
  async handleRetention(): Promise<void> {
    const now = new Date();
    
    if (this.retention_date && now >= this.retention_date) {
      if (this.data_classification === DataClassification.CONFIDENTIAL) {
        // Archive confidential data
        this.is_archived = true;
        
        // Anonymize sensitive fields
        this.description = '[REDACTED]';
        this.required_skills = this.required_skills.map(skill => ({
          ...skill,
          notes: '[REDACTED]'
        }));
      }
      
      // Update retention date for next review
      this.retention_date = new Date();
      this.retention_date.setFullYear(now.getFullYear() + 1);
      
      this.updated_at = now;
    }
  }
}