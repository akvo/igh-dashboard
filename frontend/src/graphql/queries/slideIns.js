import { gql } from '@apollo/client/core';

// =========================================================
// Slide-in queries — Aggregated Portfolio Explore panels
// =========================================================

// Candidate slide-in. Candidate identity, glance metadata,
// pipeline history, related entities — everything the panel
// renders, in one round-trip.
export const GET_SLIDE_IN_CANDIDATE = gql`
  query SlideInCandidate($candidateKey: Int!) {
    slideInCandidate(candidate_key: $candidateKey) {
      candidate {
        candidate_key
        candidate_name
        indication
        indication_type
        mechanism_of_action
        target
        key_features
        recent_updates
        current_rd_stage
      }
      product {
        product_key
        product_name
        product_type
      }
      subProduct {
        product_key
        product_name
      }
      technologyType
      diseases {
        primary
        secondary
      }
      ageGroups
      pipelineHistory {
        year
        phase_name
      }
      developers {
        name
        org_type
      }
      trials {
        trial_id
        trial_phase
        status
        trial_title
        source_text
      }
      priorities {
        priority_key
        priority_name
        indication
        intended_use
        author
        source
      }
      publications {
        publication_id
        title
        url
      }
    }
  }
`;

// Approved product slide-in — superset of candidate plus regulatory.
export const GET_SLIDE_IN_PRODUCT = gql`
  query SlideInProduct($candidateKey: Int!) {
    slideInProduct(candidate_key: $candidateKey) {
      candidate {
        candidate_key
        candidate_name
        indication
        indication_type
        mechanism_of_action
        target
        key_features
        recent_updates
        current_rd_stage
      }
      product {
        product_key
        product_name
        product_type
      }
      subProduct {
        product_key
        product_name
      }
      technologyType
      diseases {
        primary
        secondary
      }
      ageGroups
      pipelineHistory {
        year
        phase_name
      }
      developers {
        name
        org_type
      }
      trials {
        trial_id
        trial_phase
        status
        trial_title
        source_text
      }
      priorities {
        priority_key
        priority_name
        indication
        intended_use
        author
        source
      }
      publications {
        publication_id
        title
        url
      }
      regulatory {
        approval_status
        who_prequalification
        approving_authorities
      }
    }
  }
`;

// Clinical trial slide-in. Trial detail with parsed
// study_design helpers and date strings resolved server-side.
export const GET_SLIDE_IN_TRIAL = gql`
  query SlideInTrial($trialId: Int!) {
    slideInTrial(trial_id: $trialId) {
      trial {
        trial_id
        clinicaltrialid
        trial_name
        trial_title
        trial_phase
        status
        description
        enrollment_count
        study_type
        sponsor
        collaborator
        funder_type
        sex
        age_groups
        interventions
        conditions
        locations
        source_text
        start_date
        end_date
        primary_completion_date
        allocation
        intervention_model
        masking
        primary_purpose
      }
      candidate {
        candidate_key
        candidate_name
      }
      disease {
        disease_name
      }
    }
  }
`;
