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

    constructor(
        redisClient: RedisClientType<any, any, any>,
        queueName = "myQueue",
        maxWorkers = 1
    ) {
        this.queueName = queueName;
        this.redisClient = redisClient;
        this.maxWorkers = maxWorkers;
        this.activeWorkers = 0;
        this.processFn = () => {};
    }

    public async add(args: T) {
        const taskData = JSON.stringify(args);
        await this.redisClient.rPush(this.queueName, taskData);
        if (this.activeWorkers === 0) await this.processLoop();
    }

    public async process(processFn: (job: Job<T>) => any) {
        this.processFn = processFn;
    }

    private async processLoop(): Promise<boolean> {
        //check if all workers are occupied;
        if (this.activeWorkers >= this.maxWorkers) {
            return false;
        }
        this.activeWorkers++;
        const taskData = await this.redisClient.lPop(this.queueName);
        if (!taskData) {
            this.activeWorkers--;
            return false;
        }
        const currentTaskArgs: T = JSON.parse(taskData);
        await this.processFn({ data: currentTaskArgs });
        this.activeWorkers--;
        await this.processLoop();

        return true;
    }
}
