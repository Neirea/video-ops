// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any) => any>(
    callback: T,
    delay = 1000,
) => {
    let waiting = false; // Initially, we're not waiting
    return (...args: Parameters<T>) => {
        // We return a throttled function
        if (!waiting) {
            // If we're not waiting
            callback(...args); // Execute users function
            waiting = true; // Prevent future invocations
            setTimeout(() => {
                // After a period of time
                waiting = false; // And allow future invocations
            }, delay);
        }
    };
};
