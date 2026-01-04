import { Meta, StoryObj, applicationConfig } from '@storybook/angular';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideRouter } from '@angular/router';

/**
 * InvitationAccept page handles the invitation acceptance flow.
 * Shows different states based on authentication status and invitation processing.
 *
 * This is a page component that requires services, so we create wrapper components
 * for each state to demonstrate the UI.
 */

// Wrapper component for unauthenticated state
@Component({
  selector: 'app-story-invitation-unauthenticated',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <p class="invitation-text">
            You've been invited to join a household. Please sign in or create an account to accept
            this invitation.
          </p>
          <div class="actions">
            <a href="#" class="btn btn-primary">Sign In</a>
            <a href="#" class="btn btn-secondary">Create Account</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationUnauthenticatedStory {}

// Wrapper component for authenticated state
@Component({
  selector: 'app-story-invitation-authenticated',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <p class="invitation-text">
            You've been invited to join a household. Would you like to accept this invitation?
          </p>
          <div class="actions">
            <button type="button" class="btn btn-primary">Accept Invitation</button>
            <button type="button" class="btn btn-secondary">Decline</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationAuthenticatedStory {}

// Wrapper component for processing state
@Component({
  selector: 'app-story-invitation-processing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <p class="invitation-text">
            You've been invited to join a household. Would you like to accept this invitation?
          </p>
          <div class="actions">
            <button type="button" class="btn btn-primary" disabled>
              <span class="spinner"></span>
              Processing...
            </button>
            <button type="button" class="btn btn-secondary" disabled>Decline</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationProcessingStory {}

// Wrapper component for success state
@Component({
  selector: 'app-story-invitation-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="success-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Successfully joined "Smith Family"!</span>
          </div>
          <p class="redirect-note">Redirecting you to the home page...</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationSuccessStory {}

// Wrapper component for declined state
@Component({
  selector: 'app-story-invitation-declined',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="success-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Invitation declined.</span>
          </div>
          <p class="redirect-note">Redirecting you to the home page...</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationDeclinedStory {}

// Wrapper component for error state - invalid token
@Component({
  selector: 'app-story-invitation-error-invalid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="error-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Invalid invitation link. No token provided.</span>
          </div>
          <div class="actions">
            <a href="#" class="btn btn-secondary">Go to Home</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationErrorInvalidStory {}

// Wrapper component for error state - not found
@Component({
  selector: 'app-story-invitation-error-notfound',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="error-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Invitation not found or has already been processed.</span>
          </div>
          <div class="actions">
            <a href="#" class="btn btn-secondary">Go to Home</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationErrorNotFoundStory {}

// Wrapper component for error state - expired
@Component({
  selector: 'app-story-invitation-error-expired',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="error-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>Invitation has expired or is no longer valid.</span>
          </div>
          <div class="actions">
            <a href="#" class="btn btn-secondary">Go to Home</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationErrorExpiredStory {}

// Wrapper component for error state - wrong email
@Component({
  selector: 'app-story-invitation-error-wrongemail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="error-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>This invitation is not for your email address.</span>
          </div>
          <div class="actions">
            <a href="#" class="btn btn-secondary">Go to Home</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationErrorWrongEmailStory {}

// Wrapper component for error state - already member
@Component({
  selector: 'app-story-invitation-error-alreadymember',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invitation-accept-container">
      <div class="invitation-accept-card">
        <div class="card-header">
          <h1>Household Invitation</h1>
        </div>
        <div class="card-content">
          <div class="error-message">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>You are already a member of this household.</span>
          </div>
          <div class="actions">
            <a href="#" class="btn btn-secondary">Go to Home</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./invitation-accept.css'],
})
class InvitationErrorAlreadyMemberStory {}

const meta: Meta = {
  title: 'Pages/InvitationAccept',
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideRouter([])],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The Invitation Accept page handles the flow when a user clicks an invitation link from their email.

## States

- **Unauthenticated**: Shows login/register buttons with returnUrl preservation
- **Authenticated**: Shows accept/decline buttons
- **Processing**: Shows loading spinner during API call
- **Success**: Shows success message with redirect countdown
- **Error**: Shows various error messages based on the failure reason

## User Flow

1. User receives email with invitation link
2. User clicks link → lands on this page
3. If not logged in → prompted to sign in or register
4. If logged in → can accept or decline invitation
5. On success → redirected to home page after 2 seconds
        `,
      },
    },
  },
};

export default meta;

/**
 * Shown when user is not logged in. Prompts to sign in or create account.
 */
export const Unauthenticated: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-unauthenticated></app-story-invitation-unauthenticated>',
    moduleMetadata: {
      imports: [InvitationUnauthenticatedStory],
    },
  }),
};

/**
 * Shown when user is logged in. Can accept or decline the invitation.
 */
export const Authenticated: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-authenticated></app-story-invitation-authenticated>',
    moduleMetadata: {
      imports: [InvitationAuthenticatedStory],
    },
  }),
};

/**
 * Shown during API call while processing accept/decline.
 */
export const Processing: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-processing></app-story-invitation-processing>',
    moduleMetadata: {
      imports: [InvitationProcessingStory],
    },
  }),
};

/**
 * Shown after successfully accepting an invitation.
 */
export const SuccessAccepted: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-success></app-story-invitation-success>',
    moduleMetadata: {
      imports: [InvitationSuccessStory],
    },
  }),
};

/**
 * Shown after successfully declining an invitation.
 */
export const SuccessDeclined: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-declined></app-story-invitation-declined>',
    moduleMetadata: {
      imports: [InvitationDeclinedStory],
    },
  }),
};

/**
 * Shown when the invitation link has no token.
 */
export const ErrorInvalidLink: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-error-invalid></app-story-invitation-error-invalid>',
    moduleMetadata: {
      imports: [InvitationErrorInvalidStory],
    },
  }),
};

/**
 * Shown when the invitation token is not found or already used.
 */
export const ErrorNotFound: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-error-notfound></app-story-invitation-error-notfound>',
    moduleMetadata: {
      imports: [InvitationErrorNotFoundStory],
    },
  }),
};

/**
 * Shown when the invitation has expired.
 */
export const ErrorExpired: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-error-expired></app-story-invitation-error-expired>',
    moduleMetadata: {
      imports: [InvitationErrorExpiredStory],
    },
  }),
};

/**
 * Shown when the invitation was sent to a different email.
 */
export const ErrorWrongEmail: StoryObj = {
  render: () => ({
    template: '<app-story-invitation-error-wrongemail></app-story-invitation-error-wrongemail>',
    moduleMetadata: {
      imports: [InvitationErrorWrongEmailStory],
    },
  }),
};

/**
 * Shown when the user is already a member of the household.
 */
export const ErrorAlreadyMember: StoryObj = {
  render: () => ({
    template:
      '<app-story-invitation-error-alreadymember></app-story-invitation-error-alreadymember>',
    moduleMetadata: {
      imports: [InvitationErrorAlreadyMemberStory],
    },
  }),
};
