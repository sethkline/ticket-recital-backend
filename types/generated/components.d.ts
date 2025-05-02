import type { Schema, Attribute } from '@strapi/strapi';

export interface ComponentsSharedBrandingBranding extends Schema.Component {
  collectionName: 'components_components_shared_branding_brandings';
  info: {
    displayName: 'Branding';
    icon: 'file';
  };
  attributes: {
    logo: Attribute.Media;
    font_family: Attribute.String;
    colors: Attribute.Component<'shared.colors'>;
  };
}

export interface ComponentsVolunteerShiftVolunteerShift
  extends Schema.Component {
  collectionName: 'components_components_volunteer_shift_volunteer_shifts';
  info: {
    displayName: 'Volunteer Shift';
  };
  attributes: {
    start_time: Attribute.DateTime & Attribute.Required;
    end_time: Attribute.DateTime & Attribute.Required;
    filled: Attribute.Boolean & Attribute.DefaultTo<false>;
    notes: Attribute.Text;
  };
}

export interface ProgramPerformancePerformance extends Schema.Component {
  collectionName: 'components_program_performance_performances';
  info: {
    displayName: 'Performance';
  };
  attributes: {
    title: Attribute.String & Attribute.Required;
    order: Attribute.Integer;
    duration: Attribute.String;
    performers: Attribute.String;
    music: Attribute.String;
    choreographer: Attribute.String;
  };
}

export interface SharedColors extends Schema.Component {
  collectionName: 'components_shared_colors';
  info: {
    displayName: 'colors';
  };
  attributes: {};
}

export interface StudioSettingsStudioSettings extends Schema.Component {
  collectionName: 'components_studio_settings_studio_settings';
  info: {
    displayName: 'Studio Settings';
  };
  attributes: {
    timezone: Attribute.String & Attribute.DefaultTo<'America/New_York'>;
    default_ticket_price: Attribute.Decimal;
    email_settings: Attribute.JSON;
    notification_preferences: Attribute.JSON;
  };
}

export interface StudioSubscriptionSubscription extends Schema.Component {
  collectionName: 'components_studio_subscription_subscriptions';
  info: {
    displayName: 'Subscription';
  };
  attributes: {
    plan: Attribute.Enumeration<['free', 'basic', 'premium']> &
      Attribute.DefaultTo<'free'>;
    status: Attribute.Enumeration<['active', 'past_due', 'canceled']> &
      Attribute.DefaultTo<'active'>;
    stripe_customer_id: Attribute.String;
    stripe_subscription_id: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'components-shared-branding.branding': ComponentsSharedBrandingBranding;
      'components-volunteer-shift.volunteer-shift': ComponentsVolunteerShiftVolunteerShift;
      'program-performance.performance': ProgramPerformancePerformance;
      'shared.colors': SharedColors;
      'studio-settings.studio-settings': StudioSettingsStudioSettings;
      'studio-subscription.subscription': StudioSubscriptionSubscription;
    }
  }
}
