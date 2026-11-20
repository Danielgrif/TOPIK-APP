import { BaseComponent } from "./BaseComponent.ts";
import { client } from "../core/supabaseClient.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { openModal, closeModal } from "./ui_modal.ts";
import confetti from "canvas-confetti";
import "../css/feedback.css";

interface FeedbackAttachment {
  file: File;
  previewUrl: string;
  type: "image" | "video" | "file";
}

declare global {
  interface Window {
    html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  }
}

export class UIFeedback extends BaseComponent {
  private attachments: FeedbackAttachment[] = [];
  private selectedType: "bug" | "feature" | "question" = "bug";
  private selectedPriority: "low" | "medium" | "high" | "urgent" = "medium";

  constructor() {
    super("feedback-modal");
  }

  public show() {
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("feedback-modal");
      if (el) this.element = el;
    }
    this.resetForm();
    openModal("feedback-modal");
  }

  protected render(): void {
    // Initial render logic handled in HTML, updates are imperative
    this.updateAttachmentsList();
  }

  protected setupEventListeners(): void {
    // Type Selector
    const typeBtns = this.$$(".segment-btn");
    typeBtns.forEach((btn) => {
      this.addEvent(btn, "click", () => {
        typeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedType =
          (btn.getAttribute("data-value") as "bug" | "feature" | "question") || "bug";
      });
    });

    // Priority Selector
    const priorityBtns = this.$$(".priority-btn");
    priorityBtns.forEach((btn) => {
      this.addEvent(btn, "click", () => {
        priorityBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedPriority =
          (btn.getAttribute("data-value") as "low" | "medium" | "high" | "urgent") || "medium";
      });
    });

    // File Input
    const fileInput = this.$<HTMLInputElement>("#feedback-file-input");
    const dropZone = this.$("#feedback-drop-zone");

    if (dropZone && fileInput) {
      this.addEvent(dropZone, "click", (e) => {
        if ((e.target as HTMLElement).closest("#feedback-screenshot-btn")) return;
        fileInput.click();
      });
      this.addEvent(fileInput, "change", (e) => this.handleFileSelect(e));

      // Drag & Drop
      this.addEvent(dropZone, "dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
      });

      this.addEvent(dropZone, "dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
      });

      this.addEvent(dropZone, "drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
        const files = (e as DragEvent).dataTransfer?.files;
        if (files) this.processFiles(files);
      });
    }

    // Screenshot
    const screenshotBtn = this.$("#feedback-screenshot-btn");
    if (screenshotBtn) {
      this.addEvent(screenshotBtn, "click", (e) => this.captureScreenshot(e));
    }

    // Submit
    const submitBtn = this.$("#submit-feedback-btn");
    if (submitBtn) {
      this.addEvent(submitBtn, "click", () => this.submitReport());
    }
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(input.files);
    }
    input.value = ""; // Reset
  }

  private processFiles(fileList: FileList) {
    if (this.attachments.length + fileList.length > 3) {
      showToast("⚠️ Максимум 3 файла");
      return;
    }

    Array.from(fileList).forEach((file) => {
      if (file.size > 50 * 1024 * 1024) {
        showToast(`⚠️ Файл ${file.name} слишком большой (>50MB)`);
        return;
      }

      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      const reader = new FileReader();
      reader.onload = (e) => {
        // For video, we might want a thumbnail, but for now we'll use a generic icon or the video element itself in preview if small enough
        if (isVideo) {
          // Placeholder for video preview logic, using a generic video icon for now or we could create a video element
          // For file upload to edge function, we need the base64 data URL
        }

        this.attachments.push({
          file,
          previewUrl: e.target?.result as string,
          type: isImage ? "image" : isVideo ? "video" : "file",
        });
        this.updateAttachmentsList();
      };
      reader.readAsDataURL(file);
    });
  }

  private async captureScreenshot(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    // Dynamically load html2canvas if not present
    if (typeof window.html2canvas === "undefined") {
      if (document.querySelector('script[src*="html2canvas"]')) {
        // Script already injected but not ready, wait a bit
        await new Promise((r) => setTimeout(r, 500));
      }
      showToast("⏳ Загрузка инструмента скриншотов...");
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load html2canvas"));
        document.head.appendChild(script);
      }).catch((err) => {
        console.error(err);
        showToast("❌ Не удалось загрузить инструмент скриншотов");
        return;
      });
    }

    // Temporarily hide the modal to capture the underlying app
    const modal = document.getElementById("feedback-modal");
    if (modal) modal.style.opacity = "0";

    showToast("📸 Снимаем...", 1000);

    setTimeout(async () => {
      try {
        const canvas = await window.html2canvas(document.body, {
          useCORS: true,
          ignoreElements: (element: Element) =>
            element.id === "feedback-modal" || element.classList.contains("modal"),
        });

        if (modal) modal.style.opacity = "1";

        canvas.toBlob((blob: Blob | null) => {
          if (blob) {
            const file = new File([blob], `screenshot_${Date.now()}.png`, { type: "image/png" });
            this.attachments.push({
              file,
              previewUrl: canvas.toDataURL("image/png"),
              type: "image",
            });
            this.updateAttachmentsList();
            showToast("✅ Скриншот добавлен");
          }
        });
      } catch (err) {
        console.error("Screenshot error:", err);
        if (modal) modal.style.opacity = "1";
        showToast("❌ Ошибка при создании скриншота");
      }
    }, 500); // Wait for modal fade out
  }

  private updateAttachmentsList() {
    const list = this.$("#feedback-attachments-list");
    if (!list) return;

    list.innerHTML = "";
    this.attachments.forEach((att, index) => {
      const item = document.createElement("div");
      item.className = "attachment-thumbnail";

      let preview = "";
      if (att.type === "image") {
        preview = `<img src="${att.previewUrl}" />`;
      } else if (att.type === "video") {
        preview = `<div class="file-icon">🎥</div><div class="file-name" style="font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50px;">${att.file.name}</div>`;
      } else {
        preview = `<div class="file-icon">📄</div><div class="file-name" style="font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50px;">${att.file.name}</div>`;
      }

      item.innerHTML = `
        ${preview}

// Automatically open feedback modal if URL hash contains #feedback
if (window.location.hash === "#feedback") {
    uiFeedback.show();
    window.history.replaceState(null, "", window.location.pathname);
}
        <button class="remove-btn">✕</button>
      `;

      const removeBtn = item.querySelector(".remove-btn");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.attachments.splice(index, 1);
          this.updateAttachmentsList();
        });
      }

      list.appendChild(item);
    });
  }

  private async submitReport() {
    const titleInput = this.$<HTMLInputElement>("#feedback-title");
    const descInput = this.$<HTMLTextAreaElement>("#feedback-desc");
    const submitBtn = this.$<HTMLButtonElement>("#submit-feedback-btn");

    const title = titleInput?.value.trim();
    const description = descInput?.value.trim();

    if (!title || !description) {
      showToast("⚠️ Заполните тему и описание");
      if (!title) titleInput?.focus();
      else descInput?.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner-tiny"></div> Отправка...';
    }

    try {
      // Prepare attachments (Base64)
      const preparedAttachments = this.attachments.map((att) => ({
        name: att.file.name,
        type: att.file.type,
        base64: att.previewUrl.split(",")[1], // Strip data:image/png;base64, prefix
      }));

      const { data, error } = await client.functions.invoke("submit-feedback", {
        body: {
          type: this.selectedType,
          title,
          description,
          priority: this.selectedPriority,
          attachments: preparedAttachments,
        },
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      this.showSuccess();
    } catch (e: unknown) {
      console.error("Feedback error:", e);
      const message = e instanceof Error ? e.message : "Не удалось отправить";
      showToast(`❌ Ошибка: ${message}`);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "🚀 Отправить";
      }
    }
  }

  private showSuccess() {
    playTone("success");

    // Confetti from button center
    const btn = this.$("#submit-feedback-btn");
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x, y },
        zIndex: 20005, // Above modal
      });
    }

    showToast("✅ Спасибо! Мы получили ваше сообщение.");
    closeModal("feedback-modal");
    this.resetForm();
  }

  private resetForm() {
    const titleInput = this.$<HTMLInputElement>("#feedback-title");
    const descInput = this.$<HTMLTextAreaElement>("#feedback-desc");
    if (titleInput) titleInput.value = "";
    if (descInput) descInput.value = "";

    this.attachments = [];
    this.updateAttachmentsList();

    this.selectedType = "bug";
    this.selectedPriority = "medium";

    // Reset UI toggles
    const typeBtns = this.$$(".segment-btn");
    typeBtns.forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-value") === "bug");
    });

    const prioBtns = this.$$(".priority-btn");
    prioBtns.forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-value") === "medium");
    });
  }
}

// Singleton instance
export const uiFeedback = new UIFeedback();

// Global accessor for legacy/HTML onclicks
window.openFeedbackModal = () => uiFeedback.show();
