<script setup lang="ts">
import { ref } from "vue";

export interface UploadedFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

const props = defineProps<{
  files: UploadedFile[];
  maxFiles?: number;
  label?: string;
}>();

const emit = defineEmits<{
  (e: "update:files", files: UploadedFile[]): void;
}>();

const uploading = ref(false);
const uploadProgress = ref<Record<string, number>>({});
const error = ref("");
const dragOver = ref(false);

const maxFiles = props.maxFiles || 10;

function getMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    txt: "text/plain",
    md: "text/markdown",
    pdf: "application/pdf",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeMap[ext || ""] || "application/octet-stream";
}

async function handleFiles(fileList: FileList | null) {
  if (!fileList || fileList.length === 0) return;
  error.value = "";

  const remaining = maxFiles - props.files.length;
  if (remaining <= 0) {
    error.value = "Maximum files reached";
    return;
  }

  const filesToUpload = Array.from(fileList).slice(0, remaining);
  uploading.value = true;

  for (const file of filesToUpload) {
    const fileId = `${file.name}-${Date.now()}`;
    uploadProgress.value[fileId] = 0;

    try {
      // 1. Get presigned URL from our local server
      const contentType = getMimeType(file);
      const presignRes = await fetch("/api/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error || "Failed to get upload URL");
      }

      const { presignedUrl, publicUrl } = await presignRes.json();

      // 2. Upload file to OSS via presigned PUT
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", contentType);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            uploadProgress.value[fileId] = Math.round(
              (e.loaded / e.total) * 100
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload network error"));
        xhr.send(file);
      });

      // 3. Add to file list
      const uploaded: UploadedFile = {
        name: file.name,
        url: publicUrl,
        type: contentType,
        size: file.size,
      };
      emit("update:files", [...props.files, uploaded]);
    } catch (err: any) {
      error.value = err.message || "Upload failed";
    } finally {
      delete uploadProgress.value[fileId];
    }
  }

  uploading.value = false;
}

function removeFile(index: number) {
  const updated = [...props.files];
  updated.splice(index, 1);
  emit("update:files", updated);
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  handleFiles(e.dataTransfer?.files || null);
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  handleFiles(input.files);
  input.value = "";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <div class="file-upload">
    <label class="label">{{ label || "Upload Files" }}</label>

    <div
      class="drop-zone"
      :class="{ 'drag-over': dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
      @click="($refs.fileInput as HTMLInputElement).click()"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        style="display: none"
        @change="onFileInput"
      />
      <div v-if="uploading" class="uploading-text">Uploading...</div>
      <div v-else class="drop-text">
        <span class="drop-icon">+</span>
        <span>Drag files here or click to browse</span>
        <span class="drop-hint">
          {{ maxFiles - files.length }} slot{{ maxFiles - files.length !== 1 ? "s" : "" }} remaining
        </span>
      </div>
    </div>

    <!-- Upload progress -->
    <div v-for="(pct, id) in uploadProgress" :key="id" class="progress-bar">
      <div class="progress-fill" :style="{ width: pct + '%' }"></div>
      <span class="progress-text">{{ pct }}%</span>
    </div>

    <!-- Uploaded files list -->
    <div v-if="files.length > 0" class="file-list">
      <div v-for="(file, i) in files" :key="i" class="file-item">
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <span class="file-type">{{ file.type }}</span>
        <button class="remove-btn" @click.stop="removeFile(i)">x</button>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<style scoped>
.file-upload {
  margin-bottom: 16px;
}

.label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
  color: #333;
}

.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  background: #fafafa;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #4a90d9;
  background: #f0f7ff;
}

.drop-icon {
  display: block;
  font-size: 28px;
  color: #999;
  margin-bottom: 4px;
}

.drop-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 14px;
}

.drop-hint {
  font-size: 12px;
  color: #999;
}

.uploading-text {
  color: #4a90d9;
  font-weight: 600;
}

.progress-bar {
  position: relative;
  height: 20px;
  background: #eee;
  border-radius: 4px;
  margin-top: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4a90d9;
  transition: width 0.2s;
}

.progress-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.file-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
}

.file-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: #888;
  font-size: 12px;
}

.file-type {
  color: #aaa;
  font-size: 11px;
}

.remove-btn {
  background: none;
  border: none;
  color: #e55;
  font-weight: 700;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}

.error {
  color: #e55;
  font-size: 13px;
  margin-top: 6px;
}
</style>
