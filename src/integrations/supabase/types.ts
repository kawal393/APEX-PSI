export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      anchor_records: {
        Row: {
          anchor_hash: string
          bitcoin_txid: string | null
          block_height: number | null
          chain: string
          confirmed_at: string | null
          created_at: string
          entries_count: number
          explorer_url: string | null
          id: string
          merkle_roots: Json
          status: string
          updated_at: string
        }
        Insert: {
          anchor_hash: string
          bitcoin_txid?: string | null
          block_height?: number | null
          chain?: string
          confirmed_at?: string | null
          created_at?: string
          entries_count?: number
          explorer_url?: string | null
          id?: string
          merkle_roots?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          anchor_hash?: string
          bitcoin_txid?: string | null
          block_height?: number | null
          chain?: string
          confirmed_at?: string | null
          created_at?: string
          entries_count?: number
          explorer_url?: string | null
          id?: string
          merkle_roots?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      apex_api_keys: {
        Row: {
          created_at: string
          daily_limit: number
          daily_used: number
          id: string
          key_hash: string
          last_reset: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked: boolean
          scopes: string[]
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          daily_used?: number
          id?: string
          key_hash: string
          last_reset?: string
          last_used_at?: string | null
          name?: string
          prefix: string
          revoked?: boolean
          scopes?: string[]
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          daily_used?: number
          id?: string
          key_hash?: string
          last_reset?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked?: boolean
          scopes?: string[]
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      assessment_leads: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          industry: string | null
          score: number | null
          share_id: string | null
          status: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          industry?: string | null
          score?: number | null
          share_id?: string | null
          status?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          industry?: string | null
          score?: number | null
          share_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          lead_company: string | null
          lead_email: string | null
          lead_name: string | null
          message_count: number
          updated_at: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_company?: string | null
          lead_email?: string | null
          lead_name?: string | null
          message_count?: number
          updated_at?: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_company?: string | null
          lead_email?: string | null
          lead_name?: string | null
          message_count?: number
          updated_at?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message_content: string | null
          message_id: string | null
          rating: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          message_id?: string | null
          rating: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_content?: string | null
          message_id?: string | null
          rating?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_knowledge_gaps: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          question: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_knowledge_gaps_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_results: {
        Row: {
          company_name: string
          created_at: string
          id: string
          next_audit_date: string | null
          overall_score: number
          referral_code: string | null
          referral_count: number
          status: string
          trio_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          id?: string
          next_audit_date?: string | null
          overall_score?: number
          referral_code?: string | null
          referral_count?: number
          status?: string
          trio_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          next_audit_date?: string | null
          overall_score?: number
          referral_code?: string | null
          referral_count?: number
          status?: string
          trio_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          role: string | null
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          role?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          role?: string | null
        }
        Relationships: []
      }
      drip_queue: {
        Row: {
          conversation_id: string | null
          created_at: string
          drip_index: number
          id: string
          lead_company: string | null
          lead_email: string
          lead_name: string | null
          send_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          drip_index?: number
          id?: string
          lead_company?: string | null
          lead_email: string
          lead_name?: string | null
          send_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          drip_index?: number
          id?: string
          lead_company?: string | null
          lead_email?: string
          lead_name?: string | null
          send_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "drip_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          message: string
          page_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          page_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          page_url?: string | null
        }
        Relationships: []
      }
      foundation_witness_attestations: {
        Row: {
          action_type: string
          authenticator_data: string | null
          client_data_json: string | null
          created_at: string
          credential_id: string
          id: string
          notes: string | null
          public_key: string | null
          signature: string
          target_ref: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          authenticator_data?: string | null
          client_data_json?: string | null
          created_at?: string
          credential_id: string
          id?: string
          notes?: string | null
          public_key?: string | null
          signature: string
          target_ref: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          authenticator_data?: string | null
          client_data_json?: string | null
          created_at?: string
          credential_id?: string
          id?: string
          notes?: string | null
          public_key?: string | null
          signature?: string
          target_ref?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gallows_ledger: {
        Row: {
          action: string
          challenge_hash: string | null
          challenged_at: string | null
          commit_hash: string
          commit_id: string
          created_at: string
          ed25519_signature: string | null
          id: string
          merkle_leaf_hash: string
          merkle_proof: Json | null
          merkle_root: string | null
          phase: string
          pq_algorithm: string | null
          pq_public_key: string | null
          pq_signature: Json | null
          predicate_id: string
          proof_hash: string | null
          proven_at: string | null
          ratification_hash: string | null
          ratified_at: string | null
          sequence_number: number | null
          status: string | null
          tribunal_votes_approve: number | null
          tribunal_votes_reject: number | null
          user_id: string | null
          verification_time_ms: number | null
          violation_found: string | null
        }
        Insert: {
          action: string
          challenge_hash?: string | null
          challenged_at?: string | null
          commit_hash: string
          commit_id: string
          created_at?: string
          ed25519_signature?: string | null
          id?: string
          merkle_leaf_hash: string
          merkle_proof?: Json | null
          merkle_root?: string | null
          phase?: string
          pq_algorithm?: string | null
          pq_public_key?: string | null
          pq_signature?: Json | null
          predicate_id: string
          proof_hash?: string | null
          proven_at?: string | null
          ratification_hash?: string | null
          ratified_at?: string | null
          sequence_number?: number | null
          status?: string | null
          tribunal_votes_approve?: number | null
          tribunal_votes_reject?: number | null
          user_id?: string | null
          verification_time_ms?: number | null
          violation_found?: string | null
        }
        Update: {
          action?: string
          challenge_hash?: string | null
          challenged_at?: string | null
          commit_hash?: string
          commit_id?: string
          created_at?: string
          ed25519_signature?: string | null
          id?: string
          merkle_leaf_hash?: string
          merkle_proof?: Json | null
          merkle_root?: string | null
          phase?: string
          pq_algorithm?: string | null
          pq_public_key?: string | null
          pq_signature?: Json | null
          predicate_id?: string
          proof_hash?: string | null
          proven_at?: string | null
          ratification_hash?: string | null
          ratified_at?: string | null
          sequence_number?: number | null
          status?: string | null
          tribunal_votes_approve?: number | null
          tribunal_votes_reject?: number | null
          user_id?: string | null
          verification_time_ms?: number | null
          violation_found?: string | null
        }
        Relationships: []
      }
      harvest_log: {
        Row: {
          completed_at: string | null
          entries_inserted: number
          entries_qualified: number
          errors: string[] | null
          id: string
          queries_run: number
          results_found: number
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          entries_inserted?: number
          entries_qualified?: number
          errors?: string[] | null
          id?: string
          queries_run?: number
          results_found?: number
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          entries_inserted?: number
          entries_qualified?: number
          errors?: string[] | null
          id?: string
          queries_run?: number
          results_found?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      industry_silos: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_name: string
          icon: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      kill_switch_log: {
        Row: {
          created_at: string
          id: string
          reason: string
          resolved_at: string | null
          severity: string
          silo_id: string
          triggered_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          resolved_at?: string | null
          severity?: string
          silo_id: string
          triggered_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          resolved_at?: string | null
          severity?: string
          silo_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kill_switch_log_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "industry_silos"
            referencedColumns: ["id"]
          },
        ]
      }
      lattice_config: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          company: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          intent: string
          landing_page: string | null
          name: string | null
          referrer: string | null
          score: number
          source_page: string | null
          status: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          intent?: string
          landing_page?: string | null
          name?: string | null
          referrer?: string | null
          score?: number
          source_page?: string | null
          status?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          intent?: string
          landing_page?: string | null
          name?: string | null
          referrer?: string | null
          score?: number
          source_page?: string | null
          status?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      monitoring_schedules: {
        Row: {
          created_at: string
          enabled: boolean
          frequency: string
          id: string
          last_run: string | null
          next_run: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          frequency?: string
          id?: string
          last_run?: string | null
          next_run?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notary_api_keys: {
        Row: {
          api_key_hash: string
          created_at: string
          daily_limit: number
          daily_used: number
          id: string
          last_reset: string
          name: string
          tier: string
          user_id: string
        }
        Insert: {
          api_key_hash: string
          created_at?: string
          daily_limit?: number
          daily_used?: number
          id?: string
          last_reset?: string
          name?: string
          tier?: string
          user_id: string
        }
        Update: {
          api_key_hash?: string
          created_at?: string
          daily_limit?: number
          daily_used?: number
          id?: string
          last_reset?: string
          name?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
      ots_proofs: {
        Row: {
          bitcoin_block_height: number | null
          bitcoin_txid: string | null
          calendar_url: string
          commit_id: string
          created_at: string
          id: string
          ots_base64: string
          status: string
          target_hash: string
          updated_at: string
        }
        Insert: {
          bitcoin_block_height?: number | null
          bitcoin_txid?: string | null
          calendar_url: string
          commit_id: string
          created_at?: string
          id?: string
          ots_base64: string
          status?: string
          target_hash: string
          updated_at?: string
        }
        Update: {
          bitcoin_block_height?: number | null
          bitcoin_txid?: string | null
          calendar_url?: string
          commit_id?: string
          created_at?: string
          id?: string
          ots_base64?: string
          status?: string
          target_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_referrals: {
        Row: {
          commission_amount: number
          created_at: string
          id: string
          partner_id: string
          referred_email: string
          referred_user_id: string | null
          status: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          id?: string
          partner_id: string
          referred_email: string
          referred_user_id?: string | null
          status?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          id?: string
          partner_id?: string
          referred_email?: string
          referred_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          id: string
          partner_code: string
          payout_email: string | null
          status: string
          total_earnings: number
          total_referrals: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_code: string
          payout_email?: string | null
          status?: string
          total_earnings?: number
          total_referrals?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_code?: string
          payout_email?: string | null
          status?: string
          total_earnings?: number
          total_referrals?: number
          user_id?: string
        }
        Relationships: []
      }
      predicate_proofs: {
        Row: {
          created_at: string
          ed25519_signature: string | null
          evidence: Json
          id: string
          input_hash: string
          output_hash: string
          predicate_id: string
          predicate_version: string
          proof_hash: string
          receipt_id: string
          verdict: string
        }
        Insert: {
          created_at?: string
          ed25519_signature?: string | null
          evidence?: Json
          id?: string
          input_hash: string
          output_hash: string
          predicate_id: string
          predicate_version?: string
          proof_hash: string
          receipt_id: string
          verdict: string
        }
        Update: {
          created_at?: string
          ed25519_signature?: string | null
          evidence?: Json
          id?: string
          input_hash?: string
          output_hash?: string
          predicate_id?: string
          predicate_version?: string
          proof_hash?: string
          receipt_id?: string
          verdict?: string
        }
        Relationships: []
      }
      psi_challenges: {
        Row: {
          bond_amount_wei: string
          bond_hash: string
          challenge_id: string
          challenger_pubkey: string
          claim: string
          created_at: string
          id: string
          receipt_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
          window_expires_at: string
        }
        Insert: {
          bond_amount_wei?: string
          bond_hash: string
          challenge_id: string
          challenger_pubkey: string
          claim: string
          created_at?: string
          id?: string
          receipt_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          window_expires_at: string
        }
        Update: {
          bond_amount_wei?: string
          bond_hash?: string
          challenge_id?: string
          challenger_pubkey?: string
          claim?: string
          created_at?: string
          id?: string
          receipt_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          window_expires_at?: string
        }
        Relationships: []
      }
      public_attestations: {
        Row: {
          attestation_hash: string
          attestor_hash: string
          commit_id: string
          created_at: string
          id: string
          ip_country: string | null
          verification_result: string
        }
        Insert: {
          attestation_hash: string
          attestor_hash: string
          commit_id: string
          created_at?: string
          id?: string
          ip_country?: string | null
          verification_result: string
        }
        Update: {
          attestation_hash?: string
          attestor_hash?: string
          commit_id?: string
          created_at?: string
          id?: string
          ip_country?: string | null
          verification_result?: string
        }
        Relationships: []
      }
      quarantine_events: {
        Row: {
          action: string
          created_at: string
          event_hash: string
          id: string
          model_id: string
          quorum_reached: boolean
          reason: string
          signatures: Json
          threshold_required: number
        }
        Insert: {
          action: string
          created_at?: string
          event_hash: string
          id?: string
          model_id: string
          quorum_reached?: boolean
          reason: string
          signatures?: Json
          threshold_required?: number
        }
        Update: {
          action?: string
          created_at?: string
          event_hash?: string
          id?: string
          model_id?: string
          quorum_reached?: boolean
          reason?: string
          signatures?: Json
          threshold_required?: number
        }
        Relationships: []
      }
      questionnaire_responses: {
        Row: {
          ai_content_labeled: string
          ai_profiling: string
          ai_providers: string[]
          ai_system_count: number
          automated_decisions: string
          company_name: string
          company_size: string
          completed: boolean
          compliance_officer: string
          created_at: string
          eu_presence: string
          evidence_hashes: Json | null
          governance_policy: string
          high_risk_uses: string[]
          id: string
          industry: string
          personal_data: string
          right_to_explanation: string
          risk_assessments: string
          special_category_data: string[]
          updated_at: string
          user_id: string
          users_informed: string
        }
        Insert: {
          ai_content_labeled?: string
          ai_profiling?: string
          ai_providers?: string[]
          ai_system_count?: number
          automated_decisions?: string
          company_name?: string
          company_size?: string
          completed?: boolean
          compliance_officer?: string
          created_at?: string
          eu_presence?: string
          evidence_hashes?: Json | null
          governance_policy?: string
          high_risk_uses?: string[]
          id?: string
          industry?: string
          personal_data?: string
          right_to_explanation?: string
          risk_assessments?: string
          special_category_data?: string[]
          updated_at?: string
          user_id: string
          users_informed?: string
        }
        Update: {
          ai_content_labeled?: string
          ai_profiling?: string
          ai_providers?: string[]
          ai_system_count?: number
          automated_decisions?: string
          company_name?: string
          company_size?: string
          completed?: boolean
          compliance_officer?: string
          created_at?: string
          eu_presence?: string
          evidence_hashes?: Json | null
          governance_policy?: string
          high_risk_uses?: string[]
          id?: string
          industry?: string
          personal_data?: string
          right_to_explanation?: string
          risk_assessments?: string
          special_category_data?: string[]
          updated_at?: string
          user_id?: string
          users_informed?: string
        }
        Relationships: []
      }
      research_publications: {
        Row: {
          authors: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          is_own: boolean
          pub_type: string
          publication_date: string | null
          sort_order: number
          source_name: string | null
          title: string
          url: string
        }
        Insert: {
          authors?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_own?: boolean
          pub_type?: string
          publication_date?: string | null
          sort_order?: number
          source_name?: string | null
          title: string
          url: string
        }
        Update: {
          authors?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          is_own?: boolean
          pub_type?: string
          publication_date?: string | null
          sort_order?: number
          source_name?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      revenue_splits: {
        Row: {
          created_at: string
          deal_name: string
          id: string
          master_share: number
          partner_share: number
          partner_user_id: string
          silo_id: string
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          deal_name: string
          id?: string
          master_share?: number
          partner_share?: number
          partner_user_id: string
          silo_id: string
          status?: string
          total_amount?: number
        }
        Update: {
          created_at?: string
          deal_name?: string
          id?: string
          master_share?: number
          partner_share?: number
          partner_user_id?: string
          silo_id?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "revenue_splits_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "industry_silos"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_articles: {
        Row: {
          category: string
          content_md: string
          created_at: string
          description: string
          id: string
          indexnow_submitted_at: string | null
          keywords: string[]
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content_md: string
          created_at?: string
          description: string
          id?: string
          indexnow_submitted_at?: string | null
          keywords?: string[]
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content_md?: string
          created_at?: string
          description?: string
          id?: string
          indexnow_submitted_at?: string | null
          keywords?: string[]
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      silo_assignments: {
        Row: {
          access_level: string
          created_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          silo_id: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          silo_id: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          silo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "silo_assignments_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "industry_silos"
            referencedColumns: ["id"]
          },
        ]
      }
      silo_data: {
        Row: {
          compliance_score: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          record_type: string
          silo_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          record_type: string
          silo_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          compliance_score?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          record_type?: string
          silo_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "silo_data_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "industry_silos"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          landing_page: string | null
          language: string | null
          page_path: string
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          landing_page?: string | null
          language?: string | null
          page_path: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          landing_page?: string | null
          language?: string | null
          page_path?: string
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      social_proof: {
        Row: {
          approved: boolean
          author_affiliation: string | null
          author_name: string
          author_title: string | null
          created_at: string
          featured: boolean
          id: string
          quote: string
          source_type: string
          source_url: string | null
        }
        Insert: {
          approved?: boolean
          author_affiliation?: string | null
          author_name: string
          author_title?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          quote: string
          source_type?: string
          source_url?: string | null
        }
        Update: {
          approved?: boolean
          author_affiliation?: string | null
          author_name?: string
          author_title?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          quote?: string
          source_type?: string
          source_url?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          tier: string
          user_id: string
          verifications_limit: number
          verifications_used: number
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          user_id: string
          verifications_limit?: number
          verifications_used?: number
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          tier?: string
          user_id?: string
          verifications_limit?: number
          verifications_used?: number
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          id: string
          lang: string
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang: string
          translations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tribunal_auditors: {
        Row: {
          appointed_by: string | null
          auditor_name: string
          created_at: string
          id: string
          jurisdiction: string
          organization: string
          public_key: string | null
          status: string
          user_id: string
        }
        Insert: {
          appointed_by?: string | null
          auditor_name: string
          created_at?: string
          id?: string
          jurisdiction?: string
          organization: string
          public_key?: string | null
          status?: string
          user_id: string
        }
        Update: {
          appointed_by?: string | null
          auditor_name?: string
          created_at?: string
          id?: string
          jurisdiction?: string
          organization?: string
          public_key?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      tribunal_reviews: {
        Row: {
          auditor_id: string
          auditor_signature: string | null
          commit_id: string
          created_at: string
          id: string
          rationale: string | null
          verdict: string
        }
        Insert: {
          auditor_id: string
          auditor_signature?: string | null
          commit_id: string
          created_at?: string
          id?: string
          rationale?: string | null
          verdict?: string
        }
        Update: {
          auditor_id?: string
          auditor_signature?: string | null
          commit_id?: string
          created_at?: string
          id?: string
          rationale?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribunal_reviews_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "tribunal_auditors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_history: {
        Row: {
          article_number: string
          article_title: string
          compliance_result_id: string | null
          created_at: string
          id: string
          merkle_proof_hash: string | null
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          article_number: string
          article_title: string
          compliance_result_id?: string | null
          created_at?: string
          id?: string
          merkle_proof_hash?: string | null
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          article_number?: string
          article_title?: string
          compliance_result_id?: string | null
          created_at?: string
          id?: string
          merkle_proof_hash?: string | null
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_history_compliance_result_id_fkey"
            columns: ["compliance_result_id"]
            isOneToOne: false
            referencedRelation: "compliance_pulse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_history_compliance_result_id_fkey"
            columns: ["compliance_result_id"]
            isOneToOne: false
            referencedRelation: "compliance_results"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_suppliers: {
        Row: {
          contact_email: string | null
          created_at: string
          display_name: string
          domain: string
          expires_at: string | null
          id: string
          jurisdiction: string | null
          notes: string | null
          status: string
          updated_at: string
          verified_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          display_name: string
          domain: string
          expires_at?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          display_name?: string
          domain?: string
          expires_at?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          verified_at?: string
        }
        Relationships: []
      }
      visit_ledger: {
        Row: {
          created_at: string
          entry_hash: string
          id: string
          page_path: string
          prev_hash: string
          sequence_number: number
          visitor_hash: string
        }
        Insert: {
          created_at?: string
          entry_hash: string
          id?: string
          page_path: string
          prev_hash: string
          sequence_number: number
          visitor_hash: string
        }
        Update: {
          created_at?: string
          entry_hash?: string
          id?: string
          page_path?: string
          prev_hash?: string
          sequence_number?: number
          visitor_hash?: string
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      compliance_pulse: {
        Row: {
          company_name: string | null
          id: string | null
          overall_score: number | null
          status: string | null
          trio_mode: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          id?: string | null
          overall_score?: number | null
          status?: string | null
          trio_mode?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          id?: string | null
          overall_score?: number | null
          status?: string | null
          trio_mode?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gallows_public_ledger: {
        Row: {
          action: string | null
          challenge_hash: string | null
          challenged_at: string | null
          commit_hash: string | null
          commit_id: string | null
          created_at: string | null
          ed25519_signature: string | null
          id: string | null
          merkle_leaf_hash: string | null
          merkle_proof: Json | null
          merkle_root: string | null
          phase: string | null
          predicate_id: string | null
          proof_hash: string | null
          proven_at: string | null
          sequence_number: number | null
          status: string | null
          verification_time_ms: number | null
          violation_found: string | null
        }
        Insert: {
          action?: string | null
          challenge_hash?: string | null
          challenged_at?: string | null
          commit_hash?: string | null
          commit_id?: string | null
          created_at?: string | null
          ed25519_signature?: string | null
          id?: string | null
          merkle_leaf_hash?: string | null
          merkle_proof?: Json | null
          merkle_root?: string | null
          phase?: string | null
          predicate_id?: string | null
          proof_hash?: string | null
          proven_at?: string | null
          sequence_number?: number | null
          status?: string | null
          verification_time_ms?: number | null
          violation_found?: string | null
        }
        Update: {
          action?: string | null
          challenge_hash?: string | null
          challenged_at?: string | null
          commit_hash?: string | null
          commit_id?: string | null
          created_at?: string | null
          ed25519_signature?: string | null
          id?: string | null
          merkle_leaf_hash?: string | null
          merkle_proof?: Json | null
          merkle_root?: string | null
          phase?: string | null
          predicate_id?: string | null
          proof_hash?: string | null
          proven_at?: string | null
          sequence_number?: number | null
          status?: string | null
          verification_time_ms?: number | null
          violation_found?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_assessment_by_share_id: {
        Args: { p_share_id: string }
        Returns: {
          company_name: string
          industry: string
          score: number
          status: string
        }[]
      }
      get_seal_counts: {
        Args: never
        Returns: {
          approved_seals: number
          attestations: number
          confirmed_anchors: number
          ots_proofs: number
          pq_signed_seals: number
          total_seals: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      visit_ledger_head: {
        Args: never
        Returns: {
          first_entry_at: string
          head_hash: string
          head_sequence: number
          total_visits: number
        }[]
      }
      witness_visit: {
        Args: { p_page_path: string; p_visitor_id: string }
        Returns: {
          created_at: string
          entry_hash: string
          prev_hash: string
          sequence_number: number
          visitor_hash: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "auditor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "auditor"],
    },
  },
} as const
