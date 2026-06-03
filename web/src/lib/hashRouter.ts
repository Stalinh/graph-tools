// charset: utf-8
type RouteChangeHandler = (page: string) => void;

/**
 * 获取当前 URL 中的 hash 路由，默认为 'knowledge-base'
 */
export function getHashRoute(): string {
  return window.location.hash.slice(1) || 'knowledge-base';
}

/**
 * 设置 URL 中的 hash 路由
 */
export function setHashRoute(page: string) {
  window.location.hash = page;
}

/**
 * 监听 hash 路由变化
 * @returns 用于注销监听器的清理函数
 */
export function onHashRouteChange(handler: RouteChangeHandler) {
  const listener = () => handler(getHashRoute());
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
