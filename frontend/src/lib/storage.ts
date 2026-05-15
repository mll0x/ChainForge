import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".nft-data");
const IMAGES_DIR = join(DATA_DIR, "images");
const METADATA_FILE = join(DATA_DIR, "metadata.json");

interface NftMetadataRecord {
  name: string;
  description: string;
  imageUrl: string;
  storageType: "local" | "oss";
}

type MetadataStore = Record<string, NftMetadataRecord>;

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });
}

function readStore(): MetadataStore {
  ensureDataDir();
  if (!existsSync(METADATA_FILE)) return {};
  return JSON.parse(readFileSync(METADATA_FILE, "utf-8"));
}

function writeStore(store: MetadataStore) {
  ensureDataDir();
  writeFileSync(METADATA_FILE, JSON.stringify(store, null, 2));
}

// ---- Image Storage ----

export interface UploadResult {
  imageUrl: string;
  storageType: "local" | "oss";
}

/**
 * 本地存储：将图片写入 .nft-data/images/，返回本地 API 路径
 */
function saveLocal(filename: string, buffer: Buffer): UploadResult {
  ensureDataDir();
  writeFileSync(join(IMAGES_DIR, filename), buffer);
  return { imageUrl: `/api/uploads/${filename}`, storageType: "local" };
}

/**
 * TODO: 阿里云 OSS 上传
 * 将图片上传到 OSS，返回公网可访问的 URL
 */
// async function saveOss(filename: string, buffer: Buffer): Promise<UploadResult> {
//   const ossClient = new OSS({ ... });
//   await ossClient.put(`nft/${filename}`, buffer);
//   return { imageUrl: `https://${OSS_BUCKET}.oss-${OSS_REGION}.aliyuncs.com/nft/${filename}`, storageType: "oss" };
// }

export async function uploadImage(filename: string, buffer: Buffer): Promise<UploadResult> {
  // TODO: 根据 OSS 配置决定走本地还是 OSS
  // if (process.env.OSS_ACCESS_KEY_ID) {
  //   return saveOss(filename, buffer);
  // }
  return saveLocal(filename, buffer);
}

// ---- Metadata CRUD ----

export function getMetadata(tokenId: number): NftMetadataRecord | null {
  return readStore()[String(tokenId)] ?? null;
}

export function setMetadata(tokenId: number, meta: NftMetadataRecord) {
  const store = readStore();
  store[String(tokenId)] = meta;
  writeStore(store);
}

export function getAllMetadata(): MetadataStore {
  return readStore();
}
