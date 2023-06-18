import { RedisClientType } from "redis";

type Job<T> = {
    data: T;
};

export default class AsyncQueue<T extends Object> {
    private queueName: string;
    private redisClient: RedisClientType<any, any, any>;
    private maxWorkers: number;
    private activeWorkers: number;
    private processFn: (job: Job<T>) => any;
    private retryInterval: number;
    private maxRetries: number;

    constructor(
        redisClient: RedisClientType<any, any, any>,
        queueName = "myQueue",
        options: {
            maxWorkers?: number;
            retryInterval?: number;
            maxRetries?: number;
        } = {}
    ) {
        const {
            maxWorkers = 1,
            retryInterval = 30000,
            maxRetries = 3,
        } = options;
        this.queueName = queueName;
        this.redisClient = redisClient;
        this.maxWorkers = maxWorkers;
        this.activeWorkers = 0;
        this.processFn = () => {};
        this.retryInterval = retryInterval;
        this.maxRetries = maxRetries;
    }

    public async add(args: T) {
        const taskData = JSON.stringify(args);
        await this.redisClient.rPush(this.queueName, taskData);
        if (this.activeWorkers === 0) await this.processLoop();
    }

    public async process(processFn: (job: Job<T>) => any) {
        this.processFn = processFn;
    }

    private async processLoop(retryCount = 0): Promise<boolean> {
        //check if all workers are occupied;
        if (this.activeWorkers >= this.maxWorkers) {
            return false;
        }
        try {
            this.activeWorkers++;
            const taskData = await this.redisClient.lPop(this.queueName);
            if (!taskData) {
                this.activeWorkers--;
                return false;
            }
            const currentTaskArgs: T = JSON.parse(taskData);
            await this.processFn({ data: currentTaskArgs });
        } catch (error) {
            console.error(error);
            if (retryCount < this.maxRetries) {
                // Retry after the specified interval
                await sleep(this.retryInterval);
                return this.processLoop(retryCount + 1);
            } else {
                // Max retries reached, give up on the task
                console.error(`Max retries reached for task.`);
            }
        } finally {
            this.activeWorkers--;
            await this.processLoop();
        }

        return true;
    }
}

function sleep(delay: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
