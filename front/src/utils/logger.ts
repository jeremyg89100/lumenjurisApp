import log from 'loglevel';
// @ts-ignore
import remote from 'loglevel-plugin-remote';

const rawProxy = import.meta.env.VITE_URL_PROXY;
const loggerUrl = rawProxy 
  ? `${rawProxy.replace(/\/$/, '')}/api/logger`
  : '/api/logger';

const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

const customJSON = (logData: any) => ({
  comment: `[${logData.level.label.toUpperCase()}] ${logData.message} ${logData.stacktrace || ''}`,
  context: "FrontEnd error",
  page: window.location.pathname,
});

remote.apply(log, {
  format: customJSON,
  url: loggerUrl,
  headers: () => {
    const token = getCookie('authLumenJuris');
    return {
      "Content-Type": "application/json",
      "Authorization": token ? token : '', 
    };
  },
  interval: 5000,
});

log.enableAll();

(window as any).log = log;

export default log;
