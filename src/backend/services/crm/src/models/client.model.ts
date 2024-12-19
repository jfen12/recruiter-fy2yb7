/**
 * @fileoverview TypeORM entity model for client data in the CRM service
 * @version 1.0.0
 * @package RefactorTrack
 */

import { 
  Entity, 
  Column, 
  Index, 
  VersionColumn,
  BeforeInsert,
  BeforeUpdate,
  DeleteDateColumn
} from 'typeorm'; // ^0.3.17
import { 
  IsString, 
  IsEnum, 
  IsArray, 
  ValidateNested, 
  IsOptional,
  MaxLength,
  MinLength
} from 'class-validator'; // ^0.14.0
import { Type } from 'class-transformer'; // ^0.5.1

import { 
  IClient, 
  IClientContact, 
  ClientStatus, 
  IndustryType,
  ClientContactSchema,
  ClientSchema 
} from '../interfaces/client.interface';
import { BaseEntity } from '../../../shared/types/common.types';

/**
 * Client contact embedded entity for TypeORM
 */
@Entity()
class ClientContact implements IClientContact {
  @Column()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @Column()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @Column()
  @IsString()
  email: string;

  @Column()
  @IsString()
  phone: string;

  @Column()
  is_primary: boolean;
}

/**
 * Client entity with enhanced security and validation
 * Implements comprehensive tracking and audit logging
 */
@Entity('clients')
@Index(['company_name'])
@Index(['status'])
@Index(['industry'])
export class Client implements IClient, BaseEntity {
  @Column('uuid', { primary: true })
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 200,
    transformer: {
      to: (value: string) => value,
      from: (value: string) => value?.trim()
    }
  })
  @Index()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  company_name: string;

  @Column({
    type: 'enum',
    enum: IndustryType
  })
  @IsEnum(IndustryType)
  industry: IndustryType;

  @Column('jsonb')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContact)
  contacts: IClientContact[];

  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVE
  })
  @IsEnum(ClientStatus)
  status: ClientStatus;

  @Column('jsonb')
  @IsArray()
  status_history: Array<{
    status: ClientStatus;
    timestamp: Date;
    reason?: string;
  }>;

  @Column({ 
    type: 'varchar', 
    length: 500,
    transformer: {
      to: (value: string) => value,
      from: (value: string) => value?.trim()
    }
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  billing_address: string;

  @Column({ 
    type: 'text', 
    nullable: true 
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  @VersionColumn()
  version: number;

  /**
   * Lifecycle hook for data validation before insert
   * Implements comprehensive validation and generates audit log
   */
  @BeforeInsert()
  async beforeInsert(): Promise<void> {
    // Validate using Zod schema
    const validationResult = ClientSchema.safeParse(this);
    if (!validationResult.success) {
      throw new Error(`Client validation failed: ${validationResult.error.message}`);
    }

    // Initialize timestamps
    this.created_at = new Date();
    this.updated_at = new Date();

    // Initialize status history
    this.status_history = [{
      status: this.status,
      timestamp: new Date()
    }];

    // Validate contacts
    if (!this.contacts?.length) {
      throw new Error('Client must have at least one contact');
    }

    // Validate primary contact
    const primaryContacts = this.contacts.filter(contact => contact.is_primary);
    if (primaryContacts.length !== 1) {
      throw new Error('Client must have exactly one primary contact');
    }
  }

  /**
   * Lifecycle hook for data validation before update
   * Implements change tracking and audit logging
   */
  @BeforeUpdate()
  async beforeUpdate(): Promise<void> {
    // Validate using Zod schema
    const validationResult = ClientSchema.safeParse(this);
    if (!validationResult.success) {
      throw new Error(`Client validation failed: ${validationResult.error.message}`);
    }

    // Update timestamp
    this.updated_at = new Date();

    // Track status changes
    const currentStatus = this.status_history[this.status_history.length - 1];
    if (currentStatus.status !== this.status) {
      this.status_history.push({
        status: this.status,
        timestamp: new Date()
      });
    }

    // Validate contacts
    if (!this.contacts?.length) {
      throw new Error('Client must have at least one contact');
    }

    // Validate primary contact
    const primaryContacts = this.contacts.filter(contact => contact.is_primary);
    if (primaryContacts.length !== 1) {
      throw new Error('Client must have exactly one primary contact');
    }
  }

  /**
   * Custom JSON serialization method
   * Implements data sanitization and formatting
   * @returns Sanitized client data object
   */
  toJSON(): Partial<Client> {
    const {
      deleted_at,
      version,
      ...clientData
    } = this;

    return {
      ...clientData,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
      status_history: this.status_history.map(entry => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
    };
  }
}