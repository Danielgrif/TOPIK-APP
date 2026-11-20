import { BaseComponent } from "./BaseComponent.ts";
import { client } from "../core/supabaseClient.ts";
import { openModal } from "./ui_modal.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import "../css/admin.css";

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  created_at: string;
  user: { email: string; full_name: string };
  attachments: { name: string; path: string; type: string }[];
}

class UIAdmin extends BaseComponent {
  constructor() {
    super("admin-modal");
  }

  public show() {
    this.ensureStructure();
    openModal("admin-modal");
    this.loadReports();
  }

  protected render(): void {
    // Initial render is handled by loadReports which calls renderReports
  }

  protected setupEventListeners(): void {
    const refreshBtn = this.$("#admin-refresh-btn");
    if (refreshBtn) {
      this.addEvent(refreshBtn, "click", () => this.loadReports());
    }
  }

  private ensureStructure() {
    if (document.getElementById("admin-modal")) return;
    // The HTML is injected by component_loader.ts
  }

  private async loadReports() {
    const container = this.$("#admin-reports-list");
    if (!container) return;

    container.innerHTML =
      '<div style="padding:20px; text-align:center;"><div class="spinner-tiny"></div></div>';

    try {
      const { data, error } = await client.functions.invoke<{
        success?: boolean;
        reports?: Report[];
        error?: string;
      }>("get-feedback-reports", { method: "GET" });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.reports) throw new Error("Неверный ответ сервера");

      this.renderReports(data.reports);
    } catch (e) {
      const err = e as Error;
      console.error("Failed to load reports:", err);
      container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--danger);">${err.message}</div>`;
    }
  }

  private renderReports(reports: Report[]) {
    const container = this.$("#admin-reports-list");
    if (!container) return;

    if (reports.length === 0) {
      container.innerHTML =
        '<div style="padding:20px; text-align:center; color:var(--text-sub);">Нет отчётов.</div>';
      return;
    }

    container.innerHTML = reports.map((report) => this.renderReportCard(report)).join("");

    // Attach change listeners for status dropdowns
    container.querySelectorAll<HTMLSelectElement>(".admin-status-select").forEach((select) => {
      this.addEvent(select, "change", (e) => {
        const reportId = select.dataset.id;
        const newStatus = (e.target as HTMLSelectElement).value;
        if (reportId) {
          this.updateStatus(reportId, newStatus, select);
        }
      });
    });
  }

  private renderReportCard(report: Report): string {
    const priorityColors: Record<string, string> = {
      low: "#2ecc71",
      medium: "#3498db",
      high: "#f39c12",
      urgent: "#e74c3c",
    };
    const statusOptions = ["open", "in_progress", "fixed", "closed"];

    return `
            <div class="admin-report-card">
                <div class="admin-report-header">
                    <div>
                        <div class="admin-report-title">${escapeHtml(report.title)}</div>
                        <div class="admin-report-meta">
                            <span><strong>От:</strong> ${escapeHtml(report.user?.full_name || report.user?.email || "N/A")}</span>
                            <span><strong>Дата:</strong> ${new Date(report.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span class="priority-badge" style="background-color:${priorityColors[report.priority] || "#bdc3c7"}">${escapeHtml(report.priority)}</span>
                        <div style="font-size:12px; margin-top:5px;">${escapeHtml(report.type)}</div>
                    </div>
                </div>
                <div class="admin-report-body">${escapeHtml(report.description)}</div>
                <div class="admin-report-footer">
                    <select class="admin-status-select" data-id="${escapeHtml(report.id)}">
                        ${statusOptions.map((s) => `<option value="${s}" ${report.status === s ? "selected" : ""}>${s}</option>`).join("")}
                    </select>
                </div>
            </div>
        `;
  }

  private async updateStatus(reportId: string, newStatus: string, selectEl: HTMLSelectElement) {
    selectEl.disabled = true;
    try {
      const { data, error } = await client.functions.invoke<{
        success?: boolean;
        error?: string;
      }>("update-feedback-status", {
        method: "POST",
        body: { report_id: reportId, new_status: newStatus },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("Статус не был обновлён");
      showToast("✅ Статус обновлён");
    } catch (e) {
      showToast(`❌ Ошибка: ${(e as Error).message}`);
      this.loadReports(); // Revert UI on failure
    } finally {
      selectEl.disabled = false;
    }
  }
}

const adminView = new UIAdmin();

// Auto-open on #admin hash
if (window.location.hash === "#admin") {
  setTimeout(() => adminView.show(), 500); // Delay to ensure DOM is ready
  window.history.replaceState(null, "", window.location.pathname);
}
