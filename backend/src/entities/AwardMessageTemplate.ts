import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('award_message_templates')
export class AwardMessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  template_key!: string; // e.g., 'tier_achievement_email', 'certificate_email', 'multiple_tier_email'

  @Column({ type: 'varchar', length: 200 })
  template_name!: string; // e.g., 'Tier Achievement Email', 'Certificate Email'

  @Column({ type: 'text' })
  template_type!: string; // 'email', 'certificate', 'notification'

  @Column({ type: 'varchar', length: 200 })
  subject_template!: string; // Email subject template

  @Column({ type: 'text' })
  content_template!: string; // HTML content template

  @Column({ type: 'text', nullable: true })
  certificate_title!: string; // Certificate title

  @Column({ type: 'text', nullable: true })
  certificate_subtitle!: string; // Certificate subtitle

  @Column({ type: 'text', nullable: true })
  certificate_achievement_text!: string; // Achievement text for certificate

  @Column({ type: 'text', nullable: true })
  certificate_description!: string; // Description for certificate

  @Column({ type: 'text', nullable: true })
  certificate_footer!: string; // Footer text for certificate

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'varchar', length: 50, default: 'en' })
  language!: string;

  @Column({ type: 'text', nullable: true })
  description!: string; // Description of what this template is used for

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  toJSON() {
    return {
      id: this.id,
      template_key: this.template_key,
      template_name: this.template_name,
      template_type: this.template_type,
      subject_template: this.subject_template,
      content_template: this.content_template,
      certificate_title: this.certificate_title,
      certificate_subtitle: this.certificate_subtitle,
      certificate_achievement_text: this.certificate_achievement_text,
      certificate_description: this.certificate_description,
      certificate_footer: this.certificate_footer,
      is_active: this.is_active,
      language: this.language,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
