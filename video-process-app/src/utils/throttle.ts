export const throttle = <T extends Function>(callback: T, delay = 1000) => {
    let waiting = false;
    return (...args: any[]) => {
        if (!waiting) {
            callback(args);
            waiting = true;
            setTimeout(() => {
                waiting = false;
            }, delay);
        }
    };
};
