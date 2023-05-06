export function throttle<T extends (...args: any) => any>(
    callback: T,
    delay = 1000
) {
    let waiting = false; // Initially, we're not waiting
    return function (this: any, ...args: any[]) {
        // We return a throttled function
        if (!waiting) {
            // If we're not waiting
            callback.apply(this, args); // Execute users function
            waiting = true; // Prevent future invocations
            setTimeout(function () {
                // After a period of time
                waiting = false; // And allow future invocations
            }, delay);
        }
    };
}
