const isProduction = /* @echo isProduction */ ;
const environment = isProduction ? 'production' : 'staging';
const googleAnalyticsID = '/* @echo googleAnalyticsID */';

// Fire page view to Google Analytics
if (ga && googleAnalyticsID) {
  ga('create', googleAnalyticsID, 'auto');
  ga('set', { dimension1: environment });
  ga('send', 'pageview');
}
