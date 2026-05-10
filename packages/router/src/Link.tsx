/**
 * Link component - declarative navigation
 * 
 * @example
 * ```tsx
 * <Link to="/about">About</Link>
 * 
 * <Link to={{ path: '/blog', query: { page: '2' } }}>Blog</Link>
 * 
 * <Link to="/contact" replace>Contact</Link>
 * ```
 */

import { component, type Define } from 'sigx';
import { useRouter, useRoute } from './hooks.js';
import type { RouteLocationRaw } from './types.js';

type LinkProps = 
    & Define.Prop<'to', RouteLocationRaw, true>
    & Define.Prop<'replace', boolean>
    & Define.Prop<'activeClass', string>
    & Define.Prop<'exactActiveClass', string>
    & Define.Prop<'ariaCurrentValue', 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'>
    & Define.Event<'click', MouseEvent>
    & Define.Slot<'default'>;

export const Link = component<LinkProps>(({ props, slots, emit }) => {
    const router = useRouter();
    const currentRoute = useRoute();
    
    // Apply defaults
    const replace = () => props.replace ?? false;
    const activeClass = () => props.activeClass ?? 'router-link-active';
    const exactActiveClass = () => props.exactActiveClass ?? 'router-link-exact-active';
    const ariaCurrentValue = () => props.ariaCurrentValue ?? 'page';
    
    const handleClick = (event: MouseEvent) => {
        // Emit click event
        emit('click', event);
        
        // Don't navigate if:
        // - Default prevented
        // - Meta key pressed (new tab)
        // - Ctrl key pressed (new tab)
        // - Shift key pressed (new window)
        // - Right click
        if (
            event.defaultPrevented ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.button !== 0
        ) {
            return;
        }
        
        event.preventDefault();
        
        if (replace()) {
            router.replace(props.to);
        } else {
            router.push(props.to);
        }
    };
    
    return () => {
        const resolved = router.resolve(props.to);
        const href = resolved.fullPath;
        
        // Determine active state
        const isExactActive = currentRoute.path === resolved.path;
        const isActive = currentRoute.path.startsWith(resolved.path);
        
        // Build class list
        const classes: string[] = [];
        if (isActive && activeClass()) {
            classes.push(activeClass());
        }
        if (isExactActive && exactActiveClass()) {
            classes.push(exactActiveClass());
        }
        
        return (
            <a
                href={href}
                onClick={handleClick}
                class={classes.length > 0 ? classes.join(' ') : undefined}
                aria-current={isExactActive ? ariaCurrentValue() : undefined}
            >
                {slots.default()}
            </a>
        );
    };
}, { name: 'Link' });

/**
 * Alias for Link component
 */
export const RouterLink = Link;
