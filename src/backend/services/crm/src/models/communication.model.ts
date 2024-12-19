/**
 * @fileoverview TypeORM entity model for managing communication records in the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

import { 
  Entity, 
  Column, 
  Index, 
  ManyToOne, 
  JoinColumn, 
  BeforeInsert, 
  BeforeUpdate 
} from 'typeorm'; // ^0.3.17

import { 
  ICommunication, 
  CommunicationType, 
  CommunicationDirection 
} from '../interfaces/communication.interface';

import { BaseEntity } from '../../../shared/types/common.types';
import { encrypt, maskPII } from '../utils/encryption.util';

/**
 * Communication entity for tracking all client interactions with enhanced security
 * and performance optimizations
 */
@Entity('communications')
@Index(['client_id', 'type', 'direction']) // Composite index for common queries
@Index(['created_at']) // Index for chronological queries
@Index(['deleted_at']) // Index for soft delete filtering
export class Communication implements ICommunication, BaseEntity {
  @Column('uuid', { primary: true, generated: 'uuid' })
  id: string;

  @Column('uuid')
  @Index()
  client_id: string;

  @Column({
    type: 'enum',
    enum: CommunicationType,
    nullable: false
  })
  type: CommunicationType;

  @Column({
    type: 'enum',
    enum: CommunicationDirection,
    nullable: false
  })
  direction: CommunicationDirection;

  @Column('varchar', { length: 200 })
  subject: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true, select: false })
  encrypted_content: string;

  @Column('varchar', { length: 100 })
  contact_name: string;

  @Column('varchar', { length: 255, nullable: true })
  contact_email: string | null;

  @Column('varchar', { length: 20, nullable: true })
  contact_phone: string | null;

  @Column('timestamp with time zone', { nullable: true })
  scheduled_at: Date | null;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @Column('timestamp with time zone', { nullable: true })
  deleted_at: Date | null;

  @Column('integer', { default: 1 })
  version: number;

  /**
   * Lifecycle hook to handle data encryption and timestamps before insert
   */
  @BeforeInsert()
  protected beforeInsert(): void {
    this.created_at = new Date();
    this.updated_at = new Date();
    
    if (this.content) {
      this.encrypted_content = encrypt(this.content);
    }
  }

  /**
   * Lifecycle hook to handle data encryption and timestamps before update
   */
  @BeforeUpdate()
  protected beforeUpdate(): void {
    this.updated_at = new Date();
    this.version += 1;

    if (this.content) {
      this.encrypted_content = encrypt(this.content);
    }
  }

  /**
   * Converts communication entity to plain object with masked sensitive data
   * @returns Sanitized communication object
   */
  toJSON(): Record<string, any> {
    const plainObject = {
      id: this.id,
      client_id: this.client_id,
      type: this.type,
      direction: this.direction,
      subject: this.subject,
      content: this.content,
      contact_name: this.contact_name,
      contact_email: this.contact_email ? maskPII(this.contact_email) : null,
      contact_phone: this.contact_phone ? maskPII(this.contact_phone) : null,
      scheduled_at: this.scheduled_at?.toISOString() || null,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
      version: this.version
    };

    return plainObject;
  }
}