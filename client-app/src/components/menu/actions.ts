"use server";
import { revalidateTag } from "next/cache";
import dbConnect from "@/lib/db";
import { Token } from "@/models/Token";
import { bucketClient } from "@/utils/storage";
import {
    CompleteMultipartUploadCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.GCP_RAW_BUCKET!;

export async function createUpload(token: string, fileName: string) {
    await dbConnect();
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
        throw new Error("Access Denied");
        // return { error: "Access Denied" };
    }

    const key = fileName;
    const command = new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const { UploadId, Key } = await bucketClient.send(command);
    return { UploadId, Key };
}

export async function getUploadUrls(
    token: string,
    UploadId: string | undefined,
    Key: string | undefined,
    chunkCount: number
) {
    await dbConnect();
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
        throw new Error("Access Denied");
    }

    const promises = [];

    for (let index = 0; index < chunkCount; index++) {
        const command = new UploadPartCommand({
            Bucket: BUCKET_NAME,
            Key,
            UploadId,
            PartNumber: index + 1,
        });
        promises.push(getSignedUrl(bucketClient, command));
    }

    const signedUrls = await Promise.all(promises);
    const partSignedUrlList = signedUrls.map((signedUrl, index) => {
        return {
            signedUrl: signedUrl,
            PartNumber: index + 1,
        };
    });
    return { parts: partSignedUrlList };
}

export async function completeUpload(
    token: string,
    UploadId: string | undefined,
    Key: string | undefined,
    results: {
        ETag: string | undefined;
        PartNumber: number;
    }[]
) {
    await dbConnect();
    const tokens = await Token.find({ charges: { $gte: 1 } });
    if (!tokens.map((i) => i.token).includes(token)) {
        throw new Error("Access Denied");
    }
    const command = new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key,
        UploadId,
        MultipartUpload: {
            Parts: results,
        },
    });
    await bucketClient.send(command);

    // decrement until 0
    await Token.updateOne(
        { token: token, charges: { $gte: 1 } },
        { $inc: { charges: -1 } }
    );
}

export default async function action() {
    revalidateTag("videos");
}
