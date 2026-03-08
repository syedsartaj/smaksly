// User & Authentication
export { User } from './User';
export type { IUser, UserRole } from './User';

// Website Management
export { Website } from './Website';
export type { IWebsite, WebsiteStatus } from './Website';

// Domain Management
export { Domain } from './Domain';
export type { IDomain, DomainStatus, DnsStatus, SslStatus } from './Domain';

// Keyword Research
export { Keyword } from './Keyword';
export type { IKeyword, KeywordIntent, KeywordStatus, KeywordSource } from './Keyword';

// Content Management
export { Content } from './Content';
export type { IContent, ContentStatus, ContentType, ContentIntent } from './Content';

// Guest Post Management
export { GuestPost } from './GuestPost';
export type { IGuestPost, GuestPostStatus } from './GuestPost';

// Partner Management
export { Partner } from './Partner';
export type { IPartner, PartnerStatus, PartnerTier } from './Partner';

// Order Management
export { Order } from './Order';
export type { IOrder, IOrderItem, OrderStatus, PaymentStatus } from './Order';

// Commission & Payouts
export { Commission, Payout } from './Commission';
export type { ICommission, IPayout, CommissionStatus, CommissionType, PayoutMethod } from './Commission';

// SEO Metrics
export { SEOMetric } from './SEOMetric';
export type { ISEOMetric, MetricPeriod } from './SEOMetric';

// Categories
export { Category } from './Category';
export type { ICategory } from './Category';

// Website Builder
export { BuilderProject } from './BuilderProject';
export type { IBuilderProject, BuilderProjectStatus, IBuilderProjectSettings, IBuilderBlogConfig, IBuilderProjectBranding } from './BuilderProject';

export { BuilderPage } from './BuilderPage';
export type { IBuilderPage, BuilderPageType, BuilderPageStatus, IAIConversationMessage, IPageVersion } from './BuilderPage';

export { BuilderComponent } from './BuilderComponent';
export type { IBuilderComponent, BuilderComponentType, BuilderComponentScope } from './BuilderComponent';

export { BuilderAsset } from './BuilderAsset';
export type { IBuilderAsset, BuilderAssetType } from './BuilderAsset';

// Health Reports
export { HealthReport } from './HealthReport';
export type { IHealthReport } from './HealthReport';

// Issues
export { Issue } from './Issue';
export type { IIssue, IssueType, IssueSeverity, IssueStatus } from './Issue';

// SEO Platform — Keyword Master & History
export { KeywordMaster } from './KeywordMaster';
export type { IKeywordMaster, KMProvider } from './KeywordMaster';

export { KeywordHistory } from './KeywordHistory';
export type { IKeywordHistory } from './KeywordHistory';

// SEO Platform — Keyword Groups
export { KeywordGroup } from './KeywordGroup';
export type { IKeywordGroup, KeywordGroupStatus, IKeywordGroupAISuggestion } from './KeywordGroup';

// SEO Platform — AI Fix Reports
export { AIFixReport } from './AIFixReport';
export type { IAIFixReport, IFixIssue, FixIssueSeverity, FixIssueCategory } from './AIFixReport';

// SEO Platform — Uptime Monitoring
export { UptimeLog } from './UptimeLog';
export type { IUptimeLog, UptimeStatus } from './UptimeLog';

// Email Management
export { EmailAccount } from './EmailAccount';
export type { IEmailAccount, EmailAccountStatus } from './EmailAccount';

export { Email } from './Email';
export type { IEmail, IEmailContact, EmailDirection, EmailFolder } from './Email';
