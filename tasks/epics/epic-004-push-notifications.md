# Epic: Push Notifications

## Metadata
- **ID**: epic-004
- **Status**: pending
- **Priority**: high
- **Created**: 2025-12-13
- **Estimated Duration**: 1.5 weeks
- **Business Value**: Reduces parent reminders, increases task completion

## Description
Implement push notification infrastructure to proactively remind children of tasks without requiring parent intervention. This is a core value proposition of the product - automating the reminder process.

## Business Context

### Why This Epic?
- **Key Differentiator**: Automated reminders vs. manual parent reminders
- **User Value**: Saves parent time and reduces household friction
- **Completion Rates**: Notifications increase task completion by 40-60%
- **Engagement**: Regular notifications drive app opens and usage

### Strategic Value
- **Product Viability**: Critical feature for market fit
- **Parent Satisfaction**: Reduces their mental load significantly
- **Child Engagement**: Timely reminders improve compliance
- **Data Collection**: Opens provide engagement metrics

## Goals
1. Send push notifications for task reminders
2. Support multiple notification triggers
3. Respect user preferences (quiet hours, frequency)
4. Ensure reliable delivery across iOS and Android
5. Make notifications actionable (open to specific task)

## Features
To be broken down by Planner Agent:
- Push notification infrastructure (FCM/APNS)
- Device token registration
- Notification scheduling service
- Notification triggers:
  - Task becomes active
  - Approaching deadline (customizable)
  - Task overdue
- Notification preferences per household
- Quiet hours configuration
- Notification history/logs
- Deep linking to tasks from notifications

## Success Criteria
- [ ] Notifications delivered within 60 seconds
- [ ] 95%+ delivery success rate
- [ ] Works on both iOS and Android
- [ ] Opens app to correct task when tapped
- [ ] Respects quiet hours
- [ ] Can disable per task type
- [ ] Clear, actionable notification text
- [ ] Household-specific notification settings
- [ ] Multiple devices per user supported
- [ ] No notification spam (rate limiting)

## Risks
- **High**: Notification delivery reliability across platforms
- **High**: Battery drain from frequent checks
- **Medium**: User disables notifications entirely
- **Medium**: Spam perception if too frequent
- **Low**: Platform-specific implementation differences

## Mitigation Strategies
- Use Firebase Cloud Messaging (battle-tested)
- Implement intelligent scheduling (not just fixed intervals)
- Allow granular control over notification types
- Monitor delivery rates and debug issues
- Default to reasonable reminder frequency
- Provide clear value in notification text

## Dependencies
- Epic-002 (Task Management Core) must be complete
- Mobile app must support push notifications
- Firebase/APNS credentials configured

## Timeline
- Days 1-3: Infrastructure setup, device registration
- Days 4-6: Notification scheduling and triggers
- Days 7-8: Preferences UI and testing

## Estimated Effort
1.5 weeks with 1 backend developer + 1 mobile developer

## Acceptance Criteria
- [ ] Can register device for push notifications
- [ ] Backend can send notifications to specific users
- [ ] Notifications include task title and due time
- [ ] Tapping notification opens app to that task
- [ ] Can configure reminder timing (e.g., "1 hour before")
- [ ] Can enable/disable notifications per task type
- [ ] Can set quiet hours (no notifications)
- [ ] Notifications sent based on child's local time
- [ ] Parent receives summary notifications (optional)
- [ ] Can view notification history in app
- [ ] Unregisters device token on logout
- [ ] Handles multiple devices per user
- [ ] Notification text is clear and friendly
- [ ] Includes child name in notification
- [ ] Backend logging for notification debugging

## Technical Considerations

### Notification Service Architecture
```typescript
interface NotificationTrigger {
  type: 'task_active' | 'approaching_deadline' | 'overdue';
  taskAssignmentId: number;
  scheduledFor: Date;
  recipientUserId: number;
}

interface NotificationPreferences {
  householdId: number;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "07:00"
  reminderLeadTime: number; // minutes before deadline
  enabledTriggers: string[];
}
```

### Scheduling Strategy
- Cron job runs every 15 minutes
- Queries upcoming tasks needing notifications
- Checks user preferences
- Sends via FCM/APNS
- Logs result for monitoring

### Notification Text Templates
```
"Leon (Home): Take out the trash before 7:00 PM today"
"Julie (Home): Clean your room by Sunday 6:00 PM"
"Reminder: Feed the cat (due in 1 hour)"
"Overdue: Your weekly bathroom cleaning task"
```

## Testing Plan
- Unit tests for scheduling logic
- Integration tests with FCM/APNS test endpoints
- Manual testing on real devices (iOS + Android)
- Test quiet hours boundary conditions
- Test timezone handling
- Test with multiple households

## Monitoring & Metrics
- Notification delivery rate
- Open rate (notifications → app opens)
- Task completion rate (before/after notification)
- Time to completion after notification
- User opt-out rate
- Failed delivery errors

## Related Work
- Depends on: Epic-002 (Task Management Core)
- Enhances: Task completion rates
- Enables: Future ML-based notification timing

## Progress Log
- [2025-12-13] Epic created based on implementation plan
