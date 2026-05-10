/**
 * RouterView component - renders the matched route component
 * 
 * @example
 * ```tsx
 * <RouterView />
 * 
 * // With named views (for nested routes)
 * <RouterView name="sidebar" />
 * 
 * // With page props (from SSG getStaticProps)
 * <RouterView pageProps={{ posts: [...] }} />
 * ```
 */

import { component, type ComponentFactory, defineInjectable, defineProvide, type Define } from 'sigx';
import { useRoute } from './hooks.js';

type RouterViewProps = Define.Prop<'name', string> & Define.Prop<'pageProps', Record<string, unknown>>;

/**
 * Injectable for tracking RouterView depth.
 * Each nested RouterView increments the depth to render the correct matched route.
 */
const useRouterViewDepth = defineInjectable<number>(() => 0);

/**
 * Type guard to check if a component is a SignalX component factory
 */
function isComponentFactory(component: unknown): component is ComponentFactory<any, any, any> {
    return typeof component === 'function' && '__setup' in component;
}

export const RouterView = component<RouterViewProps>((ctx) => {
    // Read props reactively inside the render function
    const route = useRoute();
    
    // Get current depth from parent RouterView (0 if we're the root)
    const depth = useRouterViewDepth();
    
    // Provide incremented depth for child RouterViews
    defineProvide(useRouterViewDepth, () => depth + 1);
    
    return () => {
        // Read pageProps at render time for reactivity
        const { name: _name = 'default', pageProps = {} } = ctx.props;
        const matched = route.matched;
        
        if (matched.length === 0 || depth >= matched.length) {
            // No matched route at this depth - render nothing or fallback
            return null;
        }
        
        // Get the matched route at current depth
        const match = matched[depth];
        const Component = match.component;
        
        if (!Component) {
            return null;
        }
        
        // Lazy components created via lazy() are already ComponentFactories
        // (lazy() wraps the loader in a component() call), so they flow
        // through the normal render path below and work with <Suspense>.
        // This branch catches raw functions / invalid values that aren't
        // wrapped with lazy().
        if (!isComponentFactory(Component)) {
            console.warn(
                `[RouterView] Route "${match.path}" has a component that is not a valid ` +
                `ComponentFactory. If you are using a dynamic import, wrap it with lazy():\n\n` +
                `  import { lazy } from 'sigx';\n` +
                `  const MyPage = lazy(() => import('./MyPage'));\n\n` +
                `Then use <Suspense> around <RouterView> to show a fallback while loading.`
            );
            return null;
        }
        
        // Calculate props for component
        let componentProps: Record<string, any> = {};
        
        if (match.props === true) {
            // Pass route params as props
            componentProps = { ...route.params };
        } else if (typeof match.props === 'function') {
            componentProps = match.props(route);
        } else if (match.props && typeof match.props === 'object') {
            componentProps = { ...match.props };
        }
        
        // Merge in pageProps from getStaticProps (SSG)
        if (pageProps && Object.keys(pageProps).length > 0) {
            componentProps = { ...componentProps, ...pageProps };
        }
        
        // Render the component - Component is now properly typed as ComponentFactory
        // Use match.path as key to force unmount/remount when route changes.
        // This prevents lazy() components from stacking instead of replacing.
        return <Component key={match.path} {...componentProps} />;
    };
}, { name: 'RouterView' });
