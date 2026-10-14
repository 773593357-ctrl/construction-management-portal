(function () {
  var navButtons = Array.prototype.slice.call(document.querySelectorAll(".nav button[data-view]"));
  var views = Array.prototype.slice.call(document.querySelectorAll(".view"));
  var title = document.getElementById("view-title");
  var desc = document.getElementById("view-desc");
  var search = document.querySelector(".search");
  var depositModal = document.getElementById("deposit-modal");
  var depositProject = document.getElementById("deposit-project");
  var projectModal = document.getElementById("project-modal");
  var openProjectModalButton = document.getElementById("open-project-modal");
  var newProjectForm = document.getElementById("new-project-form");
  var recognizeButton = document.getElementById("recognize-project-screenshot");
  var recognitionStatus = document.getElementById("recognition-status");
  var projectLedgerBody = document.getElementById("project-ledger-body");
  var projectDraftBox = document.getElementById("project-draft-box");
  var projectDraftList = document.getElementById("project-draft-list");
  var projectDraftCount = document.getElementById("project-draft-count");
  var saveProjectDraftButton = document.getElementById("save-project-draft");
  var projectModalTitle = document.getElementById("project-modal-title");
  var projectModalDesc = document.getElementById("project-modal-desc");
  var projectCloseConfirmModal = document.getElementById("project-close-confirm-modal");
  var confirmSaveProjectEditButton = document.getElementById("confirm-save-project-edit");
  var discardProjectEditButton = document.getElementById("discard-project-edit");
  var appConfirmModal = document.getElementById("app-confirm-modal");
  var appConfirmTitle = document.getElementById("app-confirm-title");
  var appConfirmMessage = document.getElementById("app-confirm-message");
  var appConfirmOk = document.getElementById("app-confirm-ok");
  var appConfirmCancel = document.getElementById("app-confirm-cancel");
  var projectFormSubmit = document.getElementById("project-form-submit");
  var projectFilterControls = Array.prototype.slice.call(document.querySelectorAll("[data-project-filter]"));
  var projectDrafts = [];
  var draftStorageKey = "construction-project-drafts";
  var projectStorageKey = "construction-project-ledger";
  var projectBackupStorageKey = "construction-project-ledger-backup";
  var projectLedgerColumnWidthKey = "construction-project-ledger-column-widths";
  var progressColumnWidthKey = "construction-progress-column-widths";
  var orgColumnWidthKey = "construction-org-column-widths";
  var orgDataStorageKey = "construction-org-data";
  var savedProjects = [];
  var orgData = {};

  function getProjectFilterValue(key) {
    var control = document.querySelector("[data-project-filter='" + key + "']");
    return control ? control.value.trim().toLowerCase() : "";
  }

  function setProjectRowVisible(row, visible) {
    row.style.display = visible ? "" : "none";
    var detailId = row.getAttribute("data-detail");
    var detail = detailId ? document.getElementById(detailId) : null;
    var detailRow = detail ? detail.closest("tr") : null;
    if (detailRow) {
      detailRow.style.display = visible && detail.classList.contains("open") ? "" : "none";
    }
  }

  function applyProjectFilters() {
    var name = getProjectFilterValue("name");
    var undertake = getProjectFilterValue("undertake");
    var type = getProjectFilterValue("type");
    var status = getProjectFilterValue("status");
    var globalKeyword = search ? search.value.trim().toLowerCase() : "";

    Array.prototype.slice.call(document.querySelectorAll("#projects .project-main-row")).forEach(function (row) {
      var cells = row.children;
      var rowName = (cells[0] ? cells[0].textContent : "").trim().toLowerCase();
      var rowUndertake = (cells[1] ? cells[1].textContent : "").trim().toLowerCase();
      var rowType = (cells[2] ? cells[2].textContent : "").trim().toLowerCase();
      var statusSelect = cells[8] ? cells[8].querySelector("[data-project-status]") : null;
      var rowStatus = (statusSelect ? statusSelect.value : (cells[8] ? cells[8].textContent : "")).trim().toLowerCase();
      var rowText = row.textContent.toLowerCase();
      var matched = true;

      if (name && rowName.indexOf(name) < 0) matched = false;
      if (undertake && rowUndertake !== undertake) matched = false;
      if (type && rowType !== type) matched = false;
      if (status && rowStatus !== status) matched = false;
      if (globalKeyword && rowText.indexOf(globalKeyword) < 0) matched = false;

      setProjectRowVisible(row, matched);
    });
  }

  function activate(viewId) {
    var target = document.getElementById(viewId);
    if (!target) return;

    navButtons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-view") === viewId);
    });

    views.forEach(function (view) {
      view.classList.toggle("active", view.id === viewId);
    });

    title.textContent = target.getAttribute("data-title") || "施工管理部工作门户";
    desc.textContent = target.getAttribute("data-desc") || "";
    if (openProjectModalButton) {
      openProjectModalButton.style.display = viewId === "projects" ? "" : "none";
    }
    window.location.hash = viewId;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }

  function showAppConfirm(options) {
    options = options || {};
    if (!appConfirmModal || !appConfirmOk || !appConfirmCancel) {
      if (typeof options.onConfirm === "function") options.onConfirm();
      return;
    }
    if (appConfirmTitle) appConfirmTitle.textContent = options.title || "请确认操作";
    if (appConfirmMessage) appConfirmMessage.textContent = options.message || "确认继续吗？";
    if (appConfirmOk) appConfirmOk.textContent = options.okText || "确定";
    if (appConfirmCancel) appConfirmCancel.textContent = options.cancelText || "取消";

    appConfirmOk.onclick = function () {
      closeModal(appConfirmModal);
      if (typeof options.onConfirm === "function") options.onConfirm();
    };
    appConfirmCancel.onclick = function () {
      closeModal(appConfirmModal);
      if (typeof options.onCancel === "function") options.onCancel();
    };
    openModal(appConfirmModal);
  }

  function closeAllModals() {
    closeModal(depositModal);
    closeModal(projectModal);
    closeModal(projectCloseConfirmModal);
  }

  document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  function bindProjectRow(row) {
    if (!row || row.dataset.bound === "true") return;
    row.dataset.bound = "true";
    row.addEventListener("click", function (event) {
      if (event.target.closest("button, input, select, textarea, label")) return;
      var detailId = row.getAttribute("data-detail");
      var detail = document.getElementById(detailId);
      if (!detail) return;
      detail.classList.toggle("open");
      var detailRow = detail.closest("tr");
      if (detailRow) {
        detailRow.style.display = detail.classList.contains("open") && row.style.display !== "none" ? "" : "none";
      }
    });
  }

  function formatAmount(value) {
    var number = Number(value || 0);
    return number.toFixed(2) + "亿";
  }

  function formatAmountWanFromYi(value) {
    var number = Number(value || 0) * 10000;
    return number.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "万";
  }

  function calcPercent(completed, contract) {
    var c = Number(completed || 0);
    var total = Number(contract || 0);
    if (!total) return 0;
    return Math.max(0, Math.min(100, Math.round((c / total) * 100)));
  }

  function statusClass(status) {
    if (status === "停工") return "status-stopped";
    if (status === "在建") return "status-building";
    if (status === "完工待验") return "status-waiting";
    if (status === "竣工") return "status-completed";
    return "status-not-started";
  }

  function projectStatusSelectHtml(status) {
    var options = ["未开", "停工", "在建", "完工待验", "竣工"];
    var current = options.indexOf(status) >= 0 ? status : "未开";
    return "<select class=\"table-select " + statusClass(current) + "\" data-project-status>" +
      options.map(function (item) {
        return "<option" + (item === current ? " selected" : "") + ">" + item + "</option>";
      }).join("") +
      "</select>";
  }

  function bindProjectStatusSelect(select) {
    if (!select || select.dataset.bound === "true") return;
    select.dataset.bound = "true";
    select.addEventListener("change", function () {
      var row = select.closest(".project-main-row");
      select.className = "table-select " + statusClass(select.value);
      if (row) {
        var uid = row.getAttribute("data-uid") || "";
        var name = row.getAttribute("data-project") || (row.children[0] ? row.children[0].textContent.trim() : "");
        var target = savedProjects.find(function (project) {
          return (uid && project.uid === uid) || project.name === name;
        });
        if (target) {
          target.status = select.value;
          writeSavedProjects();
        }
        var detailId = row.getAttribute("data-detail");
        var detail = detailId ? document.getElementById(detailId) : null;
        if (detail) {
          var cards = Array.prototype.slice.call(detail.querySelectorAll(".detail-card"));
          var statusCard = cards.find(function (card) {
            var label = card.querySelector("span");
            return label && label.textContent.trim() === "项目状态";
          });
          var value = statusCard ? statusCard.querySelector("strong") : null;
          if (value) value.textContent = select.value;
        }
      }
      applyProjectFilters();
      updateDashboard();
    });
  }

  function parseAmountToYiValue(value) {
    var text = String(value || "").replace(/,/g, "").trim();
    var number = parseFloat(text.replace(/[^0-9.-]/g, ""));
    if (isNaN(number)) return 0;
    if (text.indexOf("万") >= 0) return number / 10000;
    if (text.indexOf("亿") >= 0) return number;
    return number > 100 ? number / 10000 : number;
  }

  function formatNumberTwo(value) {
    var text = String(value || "").replace(/,/g, "").trim();
    var number = parseFloat(text.replace(/[^0-9.-]/g, ""));
    return isNaN(number) ? "" : number.toFixed(2);
  }

  function formatNumberSix(value) {
    var text = String(value || "").replace(/,/g, "").trim();
    var number = parseFloat(text.replace(/[^0-9.-]/g, ""));
    if (isNaN(number)) return "";
    var fixed = number.toFixed(6);
    var parts = fixed.split(".");
    if (parts.length < 2) return fixed;
    var integer = parts[0];
    var decimal = parts[1];
    var trimmed = decimal.replace(/0+$/, "");
    if (trimmed.length === 0) trimmed = "00";
    if (trimmed.length === 1) trimmed = trimmed + "0";
    return integer + "." + trimmed;
  }

  function normalizeProjectStatus(status) {
    if (status === "停工" || status === "暂停") return "停工";
    if (status === "在建" || status === "预警" || status === "滞后") return "在建";
    if (status === "完工待验" || status === "收尾") return "完工待验";
    if (status === "竣工") return "竣工";
    return "未开";
  }

  function normalizeProjectData(data) {
    var item = Object.assign({}, data || {});
    item.uid = item.uid || ("project-" + Date.now() + "-" + Math.floor(Math.random() * 100000));
    item.name = item.name || "未命名项目";
    item.undertake = item.undertake || "集团公司名称承揽";
    item.type = item.type || "房建";
    item.status = normalizeProjectStatus(item.status || "在建");
    item.contract = parseAmountToYiValue(item.contract).toFixed(10);
    item.completed = parseAmountToYiValue(item.completed).toFixed(10);
    item.buildingArea = formatNumberTwo(item.buildingArea);
    item.manager = item.manager || item.bidManager || "";
    item.bidManager = item.bidManager || item.manager || "";
    item.startDate = item.startDate || item.contractStart || "";
    item.endDate = item.endDate || item.contractEnd || "";
    return item;
  }

  function readSavedProjects() {
    try {
      savedProjects = JSON.parse(localStorage.getItem(projectStorageKey) || "[]");
      if (!Array.isArray(savedProjects)) savedProjects = [];
      if (!savedProjects.length) {
        var backup = JSON.parse(localStorage.getItem(projectBackupStorageKey) || "[]");
        if (Array.isArray(backup) && backup.length) {
          savedProjects = backup;
          localStorage.setItem(projectStorageKey, JSON.stringify(savedProjects));
        }
      }
    } catch (error) {
      savedProjects = [];
    }
  }

  function writeSavedProjects() {
    try {
      var payload = JSON.stringify(savedProjects);
      localStorage.setItem(projectStorageKey, payload);
      localStorage.setItem(projectBackupStorageKey, payload);
    } catch (error) {
      // 原型中忽略本地存储异常
    }
  }

  function readOrgData() {
    try {
      orgData = JSON.parse(localStorage.getItem(orgDataStorageKey) || "{}");
      if (typeof orgData !== "object" || orgData === null) orgData = {};
    } catch (error) {
      orgData = {};
    }
  }

  function writeOrgData() {
    try {
      localStorage.setItem(orgDataStorageKey, JSON.stringify(orgData));
    } catch (error) {
      // 原型中忽略本地存储异常
    }
  }

  function getOrgRecordKey(row) {
    var uid = row.getAttribute("data-uid") || "";
    var name = row.getAttribute("data-project") || "";
    return name || uid || ("org-" + Date.now());
  }

  function getOrgRecord(row) {
    var uid = row.getAttribute("data-uid") || "";
    var name = row.getAttribute("data-project") || "";
    return orgData[name] || orgData[uid] || null;
  }

  function saveOrgRowState(row) {
    var key = getOrgRecordKey(row);
    var cells = row.children;
    var record = {};
    var initSelect = cells[2] ? cells[2].querySelector("select[data-init-status]") : null;
    var dateInput = cells[3] ? cells[3].querySelector("input[type=date]") : null;
    var teamSelect = cells[4] ? cells[4].querySelector("select[data-org-status]") : null;
    var fileLabel = cells[5] ? cells[5].querySelector("[data-file-name]") : null;
    var contractSelect = cells[6] ? cells[6].querySelector("select[data-contract-status]") : null;
    var depositBadge = cells[9] ? cells[9].querySelector(".badge") : null;
    if (initSelect) record.initStatus = initSelect.value;
    if (dateInput) record.dateValue = dateInput.value;
    if (teamSelect) record.teamStatus = teamSelect.value;
    if (fileLabel) record.fileName = fileLabel.textContent;
    if (contractSelect) record.contractStatus = contractSelect.value;
    if (depositBadge) record.depositStatus = depositBadge.textContent.trim();
    orgData[key] = record;
    var uid = row.getAttribute("data-uid") || "";
    var name = row.getAttribute("data-project") || "";
    if (uid) orgData[uid] = record;
    if (name) orgData[name] = record;
    writeOrgData();
  }

  function restoreOrgRowState(row) {
    var record = getOrgRecord(row);
    if (!record) return;
    var cells = row.children;
    var initSelect = cells[2] ? cells[2].querySelector("select[data-init-status]") : null;
    var dateInput = cells[3] ? cells[3].querySelector("input[type=date]") : null;
    var teamSelect = cells[4] ? cells[4].querySelector("select[data-org-status]") : null;
    var fileLabel = cells[5] ? cells[5].querySelector("[data-file-name]") : null;
    var contractSelect = cells[6] ? cells[6].querySelector("select[data-contract-status]") : null;
    var depositBadge = cells[9] ? cells[9].querySelector(".badge") : null;
    if (initSelect && record.initStatus !== undefined) initSelect.value = record.initStatus;
    if (dateInput && record.dateValue !== undefined) {
      dateInput.value = record.dateValue;
      dateInput.setAttribute("value", record.dateValue);
    }
    if (teamSelect && record.teamStatus !== undefined) teamSelect.value = record.teamStatus;
    if (fileLabel && record.fileName !== undefined) fileLabel.textContent = record.fileName;
    if (contractSelect && record.contractStatus !== undefined) contractSelect.value = record.contractStatus;
    if (depositBadge && record.depositStatus !== undefined) {
      depositBadge.textContent = record.depositStatus;
      depositBadge.className = "badge";
      depositBadge.classList.add(record.depositStatus === "已缴清" ? "success" : "gray");
    }
  }

  function getProjectLedgerTable() {
    return document.getElementById("project-ledger-table");
  }

  function readTableColumnWidths(storageKey) {
    try {
      var widths = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(widths) ? widths : [];
    } catch (error) {
      return [];
    }
  }

  function writeTableColumnWidths(storageKey, widths) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widths));
    } catch (error) {
      // 原型中忽略本地存储异常
    }
  }

  function getTableDefaultWidths(table) {
    return Array.prototype.slice.call(table.querySelectorAll("col")).map(function (col) {
      var width = parseInt(col.getAttribute("data-default-width"), 10);
      return isNaN(width) ? 120 : width;
    });
  }

  function applyTableColumnWidths(table, widths, minTableWidth) {
    if (!table) return;
    var cols = Array.prototype.slice.call(table.querySelectorAll("col"));
    if (!cols.length) return;
    var defaults = getTableDefaultWidths(table);
    var total = 0;
    cols.forEach(function (col, index) {
      var width = parseInt(widths && widths[index], 10);
      if (isNaN(width) || width < 60) width = defaults[index] || 120;
      col.style.width = width + "px";
      total += width;
    });
    if (minTableWidth) {
      table.style.minWidth = Math.max(total, minTableWidth) + "px";
    }
  }

  function initTableColumnResize(table, storageKey, options) {
    options = options || {};
    var minWidth = options.minWidth || 60;
    var maxWidth = options.maxWidth || 520;
    var minTableWidth = options.minTableWidth || 0;
    if (!table || table.dataset.resizeBound === "true") return;
    table.dataset.resizeBound = "true";
    applyTableColumnWidths(table, readTableColumnWidths(storageKey), minTableWidth);

    var headers = Array.prototype.slice.call(table.querySelectorAll("thead th"));
    var cols = Array.prototype.slice.call(table.querySelectorAll("col"));
    headers.forEach(function (header) {
      var resizeTarget = header.getAttribute("data-resize-target");
      var index = resizeTarget !== null ? parseInt(resizeTarget, 10) : headers.indexOf(header);
      if (isNaN(index) || index < 0 || !cols[index] || header.querySelector(".col-resizer")) return;
      var handle = document.createElement("span");
      handle.className = "col-resizer";
      handle.setAttribute("aria-hidden", "true");
      header.appendChild(handle);

      handle.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var startX = event.clientX;
        var startWidth = cols[index].getBoundingClientRect().width || parseInt(cols[index].style.width, 10) || 120;
        header.classList.add("resizing");
        document.body.classList.add("column-resizing");

        function onPointerMove(moveEvent) {
          var nextWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(startWidth + moveEvent.clientX - startX)));
          cols[index].style.width = nextWidth + "px";
          var widths = cols.map(function (col) {
            return Math.round(col.getBoundingClientRect().width || parseInt(col.style.width, 10) || 120);
          });
          applyTableColumnWidths(table, widths, minTableWidth);
        }

        function onPointerUp() {
          header.classList.remove("resizing");
          document.body.classList.remove("column-resizing");
          var widths = cols.map(function (col) {
            return Math.round(col.getBoundingClientRect().width || parseInt(col.style.width, 10) || 120);
          });
          writeTableColumnWidths(storageKey, widths);
          document.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("pointerup", onPointerUp);
        }

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      });
    });
  }

  function initProjectLedgerColumnResize() {
    initTableColumnResize(getProjectLedgerTable(), projectLedgerColumnWidthKey, { minWidth: 72, maxWidth: 520, minTableWidth: 1220 });
  }

  function captureLedgerProjectsFromDom() {
    if (!projectLedgerBody || savedProjects.length) return;
    var rows = Array.prototype.slice.call(projectLedgerBody.querySelectorAll(".project-main-row"));
    if (!rows.length) return;
    rows.forEach(function (row) {
      var cells = row.children;
      var statusSelect = cells[8] ? cells[8].querySelector("[data-project-status]") : null;
      savedProjects.push(normalizeProjectData({
        uid: row.getAttribute("data-uid") || "",
        name: cells[0] ? cells[0].textContent.trim() : "",
        undertake: cells[1] ? cells[1].textContent.trim() : "",
        type: cells[2] ? cells[2].textContent.trim() : "",
        contract: cells[3] ? cells[3].textContent.trim() : "",
        startDate: cells[4] ? cells[4].textContent.trim() : "",
        endDate: cells[5] ? cells[5].textContent.trim() : "",
        manager: cells[6] ? cells[6].textContent.trim() : "",
        completed: "0",
        status: statusSelect ? statusSelect.value : (cells[8] ? cells[8].textContent.trim() : "在建")
      }));
    });
    writeSavedProjects();
  }

  function saveProjectToStorage(data) {
    var item = normalizeProjectData(data);
    var existingIndex = savedProjects.findIndex(function (project) {
      return project.uid === item.uid || (project.name && project.name === item.name);
    });
    if (existingIndex >= 0) {
      item.uid = savedProjects[existingIndex].uid || item.uid;
      savedProjects[existingIndex] = item;
    } else {
      savedProjects.push(item);
    }
    writeSavedProjects();
    return item;
  }

  function parseWan(value) {
    var text = String(value || "").replace(/,/g, "");
    var number = parseFloat(text.replace(/[^0-9.-]/g, ""));
    return isNaN(number) ? 0 : number;
  }

  function formatWan(value) {
    return Math.round(Number(value || 0)).toLocaleString("zh-CN") + "万";
  }

  function formatYi(value) {
    return (Number(value || 0) / 100000000).toFixed(2) + "亿";
  }

  function parseAmountToWan(value) {
    var text = String(value || "").replace(/,/g, "").trim();
    var number = parseFloat(text.replace(/[^0-9.-]/g, ""));
    if (isNaN(number)) return 0;
    return text.indexOf("亿") >= 0 ? number * 10000 : number;
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function readPercent(value) {
    var number = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
    return isNaN(number) ? 0 : Math.max(0, Math.min(100, number));
  }

  function updateDashboard() {
    var projectRows = Array.prototype.slice.call(document.querySelectorAll("#project-ledger-body .project-main-row"));
    var activeProjects = 0;
    var contractTotalWan = 0;
    projectRows.forEach(function (row) {
      var cells = row.children;
      var statusSelect = cells[8] ? cells[8].querySelector("[data-project-status]") : null;
      var status = statusSelect ? statusSelect.value : (cells[8] ? cells[8].textContent.trim() : "");
      contractTotalWan += parseAmountToWan(cells[3] ? cells[3].textContent : "") * 10000;
      if (status === "在建") activeProjects += 1;
    });
    setText("project-ledger-count", projectRows.length + "个项目");
    setText("dash-active-projects", String(activeProjects));
    setText("dash-active-note", "项目台账共 " + projectRows.length + " 个项目");

    var progressDataRows = Array.prototype.slice.call(document.querySelectorAll("#progress-body tr[data-project]"));
    var yearOutputWan = 0;
    var normalProgress = 0;
    var progressRiskItems = [];
    var progressItems = progressDataRows.map(function (row) {
      var name = row.getAttribute("data-project") || "未命名项目";
      var cumIdx = row.querySelector(".col-cumulative");
      var ratioIdx = row.querySelector(".col-ratio");
      var contractIdx = row.querySelector(".col-contract");
      var contractWan = contractIdx ? parseWan(contractIdx.textContent) : 0;
      var cumText = cumIdx ? cumIdx.textContent.replace(/,/g, "") : "0";
      var cumWan = parseFloat(cumText.replace(/[^0-9.-]/g, "")) || 0;
      var ratio = parseFloat((ratioIdx ? ratioIdx.textContent : "0").replace(/[^0-9.-]/g, "")) || 0;
      yearOutputWan += cumWan;
      var isRisk = ratio > 0 && ratio < 80;
      if (!isRisk) normalProgress += 1;
      if (isRisk) progressRiskItems.push({ name: name, progress: ratio });
      return { name: name, progress: ratio };
    }).sort(function (a, b) {
      return a.progress - b.progress;
    });
    var progressRate = progressDataRows.length ? Math.round((normalProgress / progressDataRows.length) * 100) : 0;
    setText("dash-year-output", formatYi(yearOutputWan));
    setText("dash-year-note", "产值台账共汇总 " + progressDataRows.length + " 个项目");
    setText("dash-progress-rate", progressRate + "%");
    setText("dash-progress-note", progressRiskItems.length + " 个项目需重点跟进");
    setText("dash-progress-risk-badge", progressRiskItems.length + "项预警");
    setText("dash-progress-risk", String(progressRiskItems.length));
    setText("dash-progress-risk-note", progressRiskItems.length ? "累计完成比例低于80%" : "暂无滞后项目");

    var progressList = document.getElementById("dash-progress-list");
    if (progressList) {
      progressList.innerHTML = "";
      progressItems.slice(0, 5).forEach(function (item) {
        var div = document.createElement("div");
        div.className = "progress-item";
        div.innerHTML = '<div class="progress-meta"><strong>' + escapeHtml(item.name) + '</strong><span>' + item.progress + '%</span></div><div class="bar"><i style="--value: ' + item.progress + '%"></i></div>';
        progressList.appendChild(div);
      });
      if (!progressItems.length) progressList.innerHTML = '<div class="muted">暂无履约进度数据</div>';
    }

    var outputRate = contractTotalWan ? Math.round((yearOutputWan / contractTotalWan) * 100) : 0;
    var outputLeftWan = Math.max(0, contractTotalWan - yearOutputWan);
    var donut = document.getElementById("dash-output-donut");
    if (donut) {
      donut.style.setProperty("--rate", Math.min(outputRate, 100) + "%");
      donut.setAttribute("data-rate", outputRate + "%");
      donut.setAttribute("aria-label", "年度产值完成率 " + outputRate + "%");
    }
    setText("dash-output-done", "本年度已完成产值：" + (yearOutputWan / 100000000).toFixed(2) + " 亿元");
    setText("dash-output-left", "年度剩余产值目标：" + (outputLeftWan / 100000000).toFixed(2) + " 亿元");
    setText("dash-output-total", "项目合同总额：" + (contractTotalWan / 100000000).toFixed(2) + " 亿元");

    var inspectionRows = Array.prototype.slice.call(document.querySelectorAll("#inspection .table-wrap tbody tr"));
    var closedCount = 0;
    var qualityRisk = 0;
    var safetyRisk = 0;
    var openInspectionItems = [];
    inspectionRows.forEach(function (row) {
      var cells = row.children;
      var type = cells[2] ? cells[2].textContent.trim() : "";
      var status = cells[6] ? cells[6].textContent.trim() : "";
      var isClosed = status.indexOf("已闭合") >= 0;
      if (isClosed) closedCount += 1;
      if (!isClosed) {
        if (type === "质量") qualityRisk += 1;
        if (type === "安全") safetyRisk += 1;
        openInspectionItems.push({
          project: cells[1] ? cells[1].textContent.trim() : "",
          issue: cells[3] ? cells[3].textContent.trim() : "",
          owner: cells[4] ? cells[4].textContent.trim() : "",
          deadline: cells[5] ? cells[5].textContent.trim() : "",
          status: status
        });
      }
    });
    var closureRate = inspectionRows.length ? Math.round((closedCount / inspectionRows.length) * 100) : 0;
    setText("dash-closure-rate", closureRate + "%");
    setText("dash-closure-note", "待闭合 " + openInspectionItems.length + " 项");
    setText("dash-quality-risk", String(qualityRisk));
    setText("dash-quality-note", qualityRisk ? "质量问题待闭合" : "暂无待闭合质量问题");
    setText("dash-safety-risk", String(safetyRisk));
    setText("dash-safety-note", safetyRisk ? "安全问题待闭合" : "暂无待闭合安全问题");

    var orgIssues = [];
    Array.prototype.slice.call(document.querySelectorAll("#org .table-extra-wide tbody tr")).forEach(function (row) {
      var cells = row.children;
      var name = cells[0] ? cells[0].textContent.trim() : "";
      var initSelect = cells[2] ? cells[2].querySelector("select") : null;
      var initStatus = initSelect ? initSelect.value : (cells[2] ? cells[2].textContent.trim() : "");
      var econDate = cells[3] ? cells[3].querySelector("input[type=date]") : null;
      var orgSelect = cells[4] ? cells[4].querySelector("select") : null;
      var orgStatus = orgSelect ? orgSelect.value : (cells[4] ? cells[4].textContent.trim() : "");
      var contractSelect = cells[6] ? cells[6].querySelector("select") : null;
      var contractStatus = contractSelect ? contractSelect.value : (cells[6] ? cells[6].textContent.trim() : "");
      var issue = [];
      if (initStatus !== "已完成") issue.push("立项未完成");
      if (!econDate || !econDate.value) issue.push("经济指标未确认");
      if (orgStatus !== "已组建") issue.push("项目部未完成组建");
      if (contractStatus !== "已签订") issue.push("责任书未签订");
      if (issue.length) orgIssues.push({ name: name, issue: issue.join("、") });
    });

    var todoList = document.getElementById("dash-todo-list");
    if (todoList) {
      var todos = [];
      openInspectionItems.slice(0, 2).forEach(function (item) {
        todos.push({ title: "跟踪检查整改：" + item.project, desc: item.issue + " · 责任人：" + item.owner + " · 期限：" + item.deadline + " · " + item.status });
      });
      progressRiskItems.slice(0, 1).forEach(function (item) {
        todos.push({ title: "召开进度偏差专题会", desc: "项目：" + item.name + " · 当前进度：" + item.progress + "%" });
      });
      orgIssues.slice(0, 1).forEach(function (item) {
        todos.push({ title: "完善组织管理事项：" + item.name, desc: item.issue });
      });
      todoList.innerHTML = "";
      todos.slice(0, 4).forEach(function (item) {
        var div = document.createElement("div");
        div.className = "timeline-item";
        div.innerHTML = "<strong>" + escapeHtml(item.title) + "</strong><span>" + escapeHtml(item.desc) + "</span>";
        todoList.appendChild(div);
      });
      if (!todos.length) todoList.innerHTML = '<div class="timeline-item"><strong>暂无待办事项</strong><span>项目台账、组织管理、履约进度和检查记录均无待处理事项</span></div>';
    }
  }

  function updateOrgSummary() {
    var orgRows = Array.prototype.slice.call(document.querySelectorAll("#org tbody tr")).filter(function (r) { return !r.querySelector(".expand-cell"); });
    var total = orgRows.length;
    var initDone = 0, teamDone = 0, contractDone = 0, depositDone = 0;
    orgRows.forEach(function (row) {
      var cells = row.children;
      var initSelect = cells[2] ? cells[2].querySelector("select[data-init-status]") : null;
      var teamSelect = cells[4] ? cells[4].querySelector("select[data-org-status]") : null;
      var contractSelect = cells[6] ? cells[6].querySelector("select[data-contract-status]") : null;
      var depositBadge = cells[9] ? cells[9].querySelector(".badge") : null;
      if (initSelect && initSelect.value === "已完成") initDone += 1;
      if (teamSelect && teamSelect.value === "已组建") teamDone += 1;
      if (contractSelect && contractSelect.value === "已签订") contractDone += 1;
      if (depositBadge && depositBadge.textContent.trim() === "已缴清") depositDone += 1;
    });
    function setOrg(id, done, total, pendingLabel) {
      var count = document.getElementById(id + "-count");
      var note = document.getElementById(id + "-note");
      if (count) count.textContent = done + "/" + total;
      if (note) note.textContent = (total - done) + "个项目" + pendingLabel;
    }
    setOrg("org-init", initDone, total, "待完善");
    setOrg("org-team", teamDone, total, "待上传");
    setOrg("org-contract", contractDone, total, "待签订");
    setOrg("org-deposit", depositDone, total, "需跟进");
  }

  /* ===== 产值进度台账 ===== */
  var progressDataStorageKey = "construction-progress-output-data";
  var progressProjectStorageKey = "construction-progress-year-projects";
  var progressData = {};
  var progressProjectsByYear = {};
  var progressSelectedYear = new Date().getFullYear();

  function loadProgressData() {
    try {
      progressData = JSON.parse(localStorage.getItem(progressDataStorageKey) || "{}");
      if (!progressData || typeof progressData !== "object") progressData = {};
    } catch (e) { progressData = {}; }
  }
  function saveProgressData() {
    try { localStorage.setItem(progressDataStorageKey, JSON.stringify(progressData)); } catch (e) {}
  }
  function loadProgressProjects() {
    try {
      progressProjectsByYear = JSON.parse(localStorage.getItem(progressProjectStorageKey) || "{}");
      if (!progressProjectsByYear || typeof progressProjectsByYear !== "object") progressProjectsByYear = {};
    } catch (e) { progressProjectsByYear = {}; }
  }
  function saveProgressProjects() {
    try { localStorage.setItem(progressProjectStorageKey, JSON.stringify(progressProjectsByYear)); } catch (e) {}
  }
  function getProjectProgressKey(name, year) { return name + "|" + year; }
  function getProjectByName(name) {
    for (var i = 0; i < savedProjects.length; i++) {
      if (savedProjects[i] && savedProjects[i].name === name) return savedProjects[i];
    }
    return null;
  }
  function getLedgerProjectNames() {
    return savedProjects.filter(function (p) { return p && p.name; }).map(function (p) { return p.name; });
  }
  function ensureProgressYearProjects(year) {
    var key = String(year);
    var ledgerNames = getLedgerProjectNames();
    if (!Array.isArray(progressProjectsByYear[key])) {
      progressProjectsByYear[key] = ledgerNames.slice();
      saveProgressProjects();
      return progressProjectsByYear[key];
    }
    var oldLen = progressProjectsByYear[key].length;
    progressProjectsByYear[key] = progressProjectsByYear[key].filter(function (name) {
      return ledgerNames.indexOf(name) >= 0;
    });
    if (oldLen !== progressProjectsByYear[key].length) saveProgressProjects();
    return progressProjectsByYear[key];
  }
  function getProgressProjectsForYear(year) {
    return ensureProgressYearProjects(year).map(getProjectByName).filter(Boolean);
  }
  var progressSelectedProject = "";
  function renderProgressProjectSelect() {
    var wrapper = document.getElementById("progress-project-select-wrapper");
    var trigger = document.getElementById("progress-project-select-trigger");
    var textEl = document.getElementById("progress-project-select-text");
    var optionsEl = document.getElementById("progress-project-select-options");
    if (!wrapper || !trigger || !textEl || !optionsEl) return;
    var selectedNames = ensureProgressYearProjects(progressSelectedYear);
    var available = savedProjects.filter(function (p) {
      return p && p.name && selectedNames.indexOf(p.name) < 0;
    });
    optionsEl.innerHTML = "";
    progressSelectedProject = "";
    if (!available.length) {
      textEl.textContent = "暂无可添加项目";
      trigger.disabled = true;
      var li = document.createElement("li");
      li.className = "disabled";
      li.textContent = "暂无可添加项目";
      optionsEl.appendChild(li);
      return;
    }
    trigger.disabled = false;
    available.forEach(function (project, idx) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("data-value", project.name);
      li.textContent = project.name;
      if (idx === 0) {
        li.classList.add("active");
        progressSelectedProject = project.name;
        textEl.textContent = project.name;
      }
      li.addEventListener("click", function () {
        progressSelectedProject = project.name;
        textEl.textContent = project.name;
        optionsEl.querySelectorAll("li").forEach(function (el) { el.classList.remove("active"); });
        li.classList.add("active");
        wrapper.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      });
      optionsEl.appendChild(li);
    });
  }
  function getProjectMonthlyData(name, year) {
    var key = getProjectProgressKey(name, year);
    if (!progressData[key]) progressData[key] = {};
    return progressData[key];
  }
  function getPriorYearTotal(name, year) {
    var total = 0;
    for (var y = 2000; y < year; y++) {
      var md = progressData[name + "|" + y];
      if (md) { for (var m = 1; m <= 12; m++) { total += parseFloat(md[m]) || 0; } }
    }
    return total;
  }
  function getYearTotal(name, year) {
    var total = 0;
    var md = progressData[name + "|" + year];
    if (md) { for (var m = 1; m <= 12; m++) { total += parseFloat(md[m]) || 0; } }
    return total;
  }

  function renderProgressTable() {
    var thead = document.getElementById("progress-thead");
    var tbody = document.getElementById("progress-body");
    var yearSelect = document.getElementById("progress-year-select");
    var yearBadge = document.getElementById("progress-year-badge");
    if (!thead || !tbody) return;

    var year = progressSelectedYear;
    var yearProjects = getProgressProjectsForYear(year);
    /* 按项目承揽类型 → 项目类型 → 开工日期排序 */
    var undertakeOrder = { "集团公司名称承揽": 0, "联合体承揽": 1, "厦门公司承揽": 2 };
    var typeOrder = { "公建": 0, "房建": 1, "机电": 2, "其他": 3 };
    yearProjects.sort(function (a, b) {
      var ua = undertakeOrder[a.undertake] != null ? undertakeOrder[a.undertake] : 99;
      var ub = undertakeOrder[b.undertake] != null ? undertakeOrder[b.undertake] : 99;
      if (ua !== ub) return ua - ub;
      var ta = typeOrder[a.type] != null ? typeOrder[a.type] : 99;
      var tb = typeOrder[b.type] != null ? typeOrder[b.type] : 99;
      if (ta !== tb) return ta - tb;
      var da = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      var db = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return da - db;
    });

    /* 年份下拉 */
    if (yearSelect) {
      var currentVal = yearSelect.value;
      yearSelect.innerHTML = "";
      var nowYear = new Date().getFullYear();
      var startYear = 2020;
      for (var y = nowYear; y >= startYear; y--) {
        var opt = document.createElement("option");
        opt.value = y; opt.textContent = y + "年";
        if (String(y) === currentVal || (!currentVal && y === year)) opt.selected = true;
        yearSelect.appendChild(opt);
      }
      if (!currentVal) yearSelect.value = year;
    }
    if (yearBadge) yearBadge.textContent = year + "年";

    /* 表头 */
    var priorYears = [];
    for (var py = year - 1; py >= Math.max(year - 3, 2000); py--) priorYears.push(py);

    var table = document.getElementById("progress-table");
    if (table) {
      var colgroup = table.querySelector("colgroup");
      if (!colgroup) {
        colgroup = document.createElement("colgroup");
        table.insertBefore(colgroup, table.firstChild);
      }
      colgroup.innerHTML = "";
      var colSpecs = [
        { cls: "col-project-name", w: 160 },
        { cls: "col-contract", w: 100 },
        { cls: "col-dates", w: 90 },
        { cls: "col-dates", w: 90 }
      ];
      for (var pyc = 0; pyc < priorYears.length; pyc++) {
        colSpecs.push({ cls: "col-prior-year", w: 90 });
      }
      for (var mc = 0; mc < 12; mc++) {
        colSpecs.push({ cls: "col-month", w: 90 });
      }
      for (var qc = 0; qc < 4; qc++) {
        colSpecs.push({ cls: "col-quarter", w: 80 });
      }
      colSpecs.push({ cls: "col-year-total", w: 96 });
      colSpecs.push({ cls: "col-cumulative", w: 96 });
      colSpecs.push({ cls: "col-ratio", w: 78 });
      colSpecs.push({ cls: "col-status", w: 68 });
      colSpecs.push({ cls: "col-actions", w: 72 });
      colSpecs.forEach(function (spec) {
        var col = document.createElement("col");
        col.className = spec.cls;
        col.setAttribute("data-default-width", spec.w);
        colgroup.appendChild(col);
      });
    }

    var colIdx = 0;
    var headerHTML = '<tr class="year-header">';
    headerHTML += '<th rowspan="2" class="col-project-name" data-resize-target="' + (colIdx++) + '">承接工程名称</th>';
    headerHTML += '<th rowspan="2" class="col-contract" data-resize-target="' + (colIdx++) + '">签订合同额<br>(元)</th>';
    headerHTML += '<th rowspan="2" class="col-dates" data-resize-target="' + (colIdx++) + '">开工时间</th>';
    headerHTML += '<th rowspan="2" class="col-dates" data-resize-target="' + (colIdx++) + '">竣工时间</th>';
    if (priorYears.length > 0) {
      headerHTML += '<th colspan="' + priorYears.length + '" style="background:#dce8d8;text-align:center;">历年已完产值(元)</th>';
      colIdx += priorYears.length;
    }
    headerHTML += '<th colspan="12" style="background:#d5e3f5;text-align:center;">' + year + '年建筑业总产值(元)</th>';
    colIdx += 12;
    headerHTML += '<th colspan="4" style="background:#fff3e0;text-align:center;">季度产值合计(元)</th>';
    colIdx += 4;
    headerHTML += '<th rowspan="2" class="col-year-total" data-resize-target="' + (colIdx++) + '">本年累计</th>';
    headerHTML += '<th rowspan="2" class="col-cumulative" data-resize-target="' + (colIdx++) + '">开工至报告期<br>累计完成总产值</th>';
    headerHTML += '<th rowspan="2" class="col-ratio" data-resize-target="' + (colIdx++) + '">累计完成比例</th>';
    headerHTML += '<th rowspan="2" class="col-status" data-resize-target="' + (colIdx++) + '">状态</th>';
    headerHTML += '<th rowspan="2" class="col-actions" data-resize-target="' + (colIdx++) + '">操作</th>';
    headerHTML += '</tr>';

    colIdx = 4;
    headerHTML += '<tr class="sub-header">';
    for (var pi = 0; pi < priorYears.length; pi++) {
      headerHTML += '<th class="col-prior-year" data-resize-target="' + (colIdx++) + '">' + priorYears[pi] + '年</th>';
    }
    for (var mi = 1; mi <= 12; mi++) {
      headerHTML += '<th class="col-month" data-resize-target="' + (colIdx++) + '">' + mi + '月</th>';
    }
    var quarterNames = ["一季度", "二季度", "三季度", "四季度"];
    for (var qi = 0; qi < 4; qi++) {
      headerHTML += '<th class="col-quarter" data-resize-target="' + (colIdx++) + '">' + quarterNames[qi] + '</th>';
    }
    headerHTML += '</tr>';

    thead.innerHTML = headerHTML;

    /* 动态设置 sub-header 的 sticky 偏移，确保与 year-header 行高完全吻合 */
    var yearHeaderRow = thead.querySelector("tr.year-header");
    var subHeaderRow = thead.querySelector("tr.sub-header");
    if (yearHeaderRow && subHeaderRow) {
      var yearHeaderHeight = yearHeaderRow.getBoundingClientRect().height;
      if (yearHeaderHeight > 0) {
        var subThs = subHeaderRow.querySelectorAll("th");
        for (var si = 0; si < subThs.length; si++) {
          subThs[si].style.top = yearHeaderHeight + "px";
        }
      }
    }

    /* 表体 */
    tbody.innerHTML = "";
    var grandMonthTotals = {};
    var grandQuarterTotals = [0, 0, 0, 0];
    var grandYearTotal = 0;
    var grandCumTotal = 0;
    var grandContractTotal = 0;

    /* 判断是否为重点项目：集团/联合体/厦门承揽 且 房建/公建 */
    function isKeyProject(p) {
      var keyUndertake = { "集团公司名称承揽": 1, "联合体承揽": 1, "厦门公司承揽": 1 };
      var keyType = { "公建": 1, "房建": 1 };
      return !!(keyUndertake[p.undertake] && keyType[p.type]);
    }

    function newGroupTotals() { return { contract: 0, yearTotal: 0, cumTotal: 0, month: {}, quarter: [0, 0, 0, 0] }; }
    var keyTotals = newGroupTotals();
    var otherTotals = newGroupTotals();

    /* 渲染单个项目行并累计到分组汇总 */
    function appendProjectRow(proj) {
      if (!proj || !proj.name) return;
      var contractYuan = Math.round(Number(proj.contract || 0) * 100000000);
      var md = getProjectMonthlyData(proj.name, year);
      var priorTotal = getPriorYearTotal(proj.name, year);
      var yearTotal = getYearTotal(proj.name, year);
      var cumTotal = priorTotal + yearTotal;
      var ratio = contractYuan > 0 ? (cumTotal / contractYuan * 100).toFixed(1) : "0.0";

      grandContractTotal += contractYuan;
      grandYearTotal += yearTotal;
      grandCumTotal += cumTotal;

      var gt = isKeyProject(proj) ? keyTotals : otherTotals;
      gt.contract += contractYuan;
      gt.yearTotal += yearTotal;
      gt.cumTotal += cumTotal;

      var tr = document.createElement("tr");
      tr.setAttribute("data-project", proj.name);
      tr.setAttribute("data-uid", proj.uid || "");

      var cells = '';
      cells += '<td class="col-project-name">' + escapeHtml(proj.name) + '</td>';
      cells += '<td class="col-contract">' + formatNum(contractYuan) + '</td>';
      cells += '<td class="col-dates">' + escapeHtml(proj.startDate || "—") + '</td>';
      cells += '<td class="col-dates">' + escapeHtml(proj.endDate || "—") + '</td>';

      for (var pi2 = 0; pi2 < priorYears.length; pi2++) {
        var pyt = getYearTotal(proj.name, priorYears[pi2]);
        cells += '<td class="col-prior-year">' + (pyt > 0 ? formatNum(pyt) : '—') + '</td>';
      }

      for (var m = 1; m <= 12; m++) {
        var hasMonthValue = Object.prototype.hasOwnProperty.call(md, m);
        var val = hasMonthValue ? md[m] : "";
        var cls = hasMonthValue ? "val-input has-value" : "val-input";
        cells += '<td class="col-month"><input type="text" inputmode="decimal" class="' + cls + '" data-project="' + escapeAttr(proj.name) + '" data-year="' + year + '" data-month="' + m + '" value="' + escapeAttr(val) + '" placeholder="填写"></td>';
        grandMonthTotals[m] = (grandMonthTotals[m] || 0) + (parseFloat(val) || 0);
        gt.month[m] = (gt.month[m] || 0) + (parseFloat(val) || 0);
      }

      /* 季度产值合计 */
      var quarterVals = [0, 0, 0, 0];
      for (var qi2 = 0; qi2 < 4; qi2++) {
        var qStart = qi2 * 3 + 1;
        for (var qmi = 0; qmi < 3; qmi++) {
          quarterVals[qi2] += (md[qStart + qmi] || 0);
        }
        grandQuarterTotals[qi2] += quarterVals[qi2];
        gt.quarter[qi2] += quarterVals[qi2];
        cells += '<td class="col-quarter computed-val">' + (quarterVals[qi2] > 0 ? formatNum(quarterVals[qi2]) : '—') + '</td>';
      }

      cells += '<td class="col-year-total computed-val">' + (yearTotal > 0 ? formatNum(yearTotal) : '—') + '</td>';
      cells += '<td class="col-cumulative computed-val">' + (cumTotal > 0 ? formatNum(cumTotal) : '—') + '</td>';
      cells += '<td class="col-ratio">' + ratio + '%</td>';

      var status = proj.status || "未开";
      var statusCls = "not-started";
      if (status === "在建") statusCls = "active";
      else if (status === "完工待验" || status === "竣工") statusCls = "completed";
      else if (status === "停工") statusCls = "stopped";
      cells += '<td class="col-status"><span class="status-badge ' + statusCls + '">' + escapeHtml(status) + '</span></td>';
      cells += '<td class="col-actions"><button class="delete-progress-project" type="button" data-project="' + escapeAttr(proj.name) + '" data-year="' + year + '">删除</button></td>';

      tr.innerHTML = cells;
      tbody.appendChild(tr);
    }

    /* 渲染分组小计行 */
    function appendSubtotalRow(groupKey, label, gt) {
      var subTr = document.createElement("tr");
      subTr.className = "group-subtotal";
      subTr.setAttribute("data-group", groupKey);
      var subCells = '';
      subCells += '<td class="col-project-name">' + escapeHtml(label) + '</td>';
      subCells += '<td class="col-contract">' + formatNum(gt.contract) + '</td>';
      subCells += '<td class="col-dates">—</td>';
      subCells += '<td class="col-dates">—</td>';
      for (var pi3 = 0; pi3 < priorYears.length; pi3++) {
        subCells += '<td class="col-prior-year">—</td>';
      }
      for (var m2 = 1; m2 <= 12; m2++) {
        subCells += '<td class="col-month computed-val">' + (gt.month[m2] > 0 ? formatNum(gt.month[m2]) : '—') + '</td>';
      }
      for (var sqi = 0; sqi < 4; sqi++) {
        subCells += '<td class="col-quarter computed-val">' + (gt.quarter[sqi] > 0 ? formatNum(gt.quarter[sqi]) : '—') + '</td>';
      }
      subCells += '<td class="col-year-total computed-val">' + (gt.yearTotal > 0 ? formatNum(gt.yearTotal) : '—') + '</td>';
      subCells += '<td class="col-cumulative computed-val">' + (gt.cumTotal > 0 ? formatNum(gt.cumTotal) : '—') + '</td>';
      subCells += '<td class="col-ratio">—</td>';
      subCells += '<td class="col-status">—</td>';
      subCells += '<td class="col-actions">—</td>';
      subTr.innerHTML = subCells;
      tbody.appendChild(subTr);
    }

    /* 按分组渲染：重点项目 → 小计 → 其他项目 → 小计 */
    yearProjects.forEach(function (proj) {
      if (isKeyProject(proj)) appendProjectRow(proj);
    });
    appendSubtotalRow("key", "集团/联合体/厦门承揽·房建/公建 小计", keyTotals);

    yearProjects.forEach(function (proj) {
      if (!isKeyProject(proj)) appendProjectRow(proj);
    });
    appendSubtotalRow("other", "其他项目 小计", otherTotals);

    /* 合计行 */
    var totalTr = document.createElement("tr");
    totalTr.className = "total-row";
    var totalCells = '';
    totalCells += '<td class="col-project-name">合计</td>';
    totalCells += '<td class="col-contract">' + formatNum(grandContractTotal) + '</td>';
    totalCells += '<td class="col-dates">—</td>';
    totalCells += '<td class="col-dates">—</td>';
    for (var pi3 = 0; pi3 < priorYears.length; pi3++) {
      totalCells += '<td class="col-prior-year">—</td>';
    }
    for (var m2 = 1; m2 <= 12; m2++) {
      totalCells += '<td class="col-month computed-val">' + (grandMonthTotals[m2] > 0 ? formatNum(grandMonthTotals[m2]) : '—') + '</td>';
    }
    for (var tqi = 0; tqi < 4; tqi++) {
      totalCells += '<td class="col-quarter computed-val">' + (grandQuarterTotals[tqi] > 0 ? formatNum(grandQuarterTotals[tqi]) : '—') + '</td>';
    }
    totalCells += '<td class="col-year-total computed-val">' + (grandYearTotal > 0 ? formatNum(grandYearTotal) : '—') + '</td>';
    totalCells += '<td class="col-cumulative computed-val">' + (grandCumTotal > 0 ? formatNum(grandCumTotal) : '—') + '</td>';
    totalCells += '<td class="col-ratio">—</td>';
    totalCells += '<td class="col-status">—</td>';
    totalCells += '<td class="col-actions">—</td>';
    totalTr.innerHTML = totalCells;
    tbody.appendChild(totalTr);

    /* 公司总产值行 */
    var companyTr = document.createElement("tr");
    companyTr.className = "total-year";
    var companyCells = '';
    companyCells += '<td class="col-project-name grand-total-label">公司总产值</td>';
    companyCells += '<td colspan="' + (3 + priorYears.length) + '"></td>';
    for (var m3 = 1; m3 <= 12; m3++) {
      companyCells += '<td class="col-month computed-val">' + (grandMonthTotals[m3] > 0 ? formatNum(grandMonthTotals[m3]) : '—') + '</td>';
    }
    for (var cqi = 0; cqi < 4; cqi++) {
      companyCells += '<td class="col-quarter computed-val">' + (grandQuarterTotals[cqi] > 0 ? formatNum(grandQuarterTotals[cqi]) : '—') + '</td>';
    }
    companyCells += '<td class="col-year-total computed-val">' + (grandYearTotal > 0 ? formatNum(grandYearTotal) : '—') + '</td>';
    companyCells += '<td class="col-cumulative computed-val">' + (grandCumTotal > 0 ? formatNum(grandCumTotal) : '—') + '</td>';
    companyCells += '<td colspan="3"></td>';
    companyTr.innerHTML = companyCells;
    tbody.appendChild(companyTr);

    /* 汇总指标 */
    var yearTotalEl = document.getElementById("progress-year-total");
    var contractTotalEl = document.getElementById("progress-contract-total");
    var yearLabel = document.getElementById("progress-selected-year-label");
    var yearNote = document.getElementById("progress-year-total-note");
    if (yearTotalEl) yearTotalEl.textContent = formatYi(grandYearTotal);
    if (contractTotalEl) contractTotalEl.textContent = formatYi(grandContractTotal);
    if (yearLabel) yearLabel.textContent = year + "年总产值";
    if (yearNote) yearNote.textContent = "自动汇总" + year + "年各项目各月产值";

    /* 绑定输入事件 */
    renderProgressProjectSelect();
    bindProgressInputs();
    bindProgressDeleteButtons();
    updateDashboard();

    /* 初始化列宽调整 */
    if (table) {
      table.dataset.resizeBound = "false";
      initTableColumnResize(table, progressColumnWidthKey, { minWidth: 60, maxWidth: 400, minTableWidth: 1280 });
    }
  }

  function bindProgressInputs() {
    if (document.body.dataset.progressInputBound === "true") return;
    document.body.dataset.progressInputBound = "true";

    document.addEventListener("focusin", function (event) {
      if (event.target && event.target.classList && event.target.classList.contains("val-input")) {
        event.target.select();
      }
    });

    document.addEventListener("input", function (event) {
      if (!event.target || !event.target.classList || !event.target.classList.contains("val-input")) return;
      if (!event.target.closest("#progress-body")) return;
      handleProgressInput(event.target, false);
    });

    document.addEventListener("change", function (event) {
      if (!event.target || !event.target.classList || !event.target.classList.contains("val-input")) return;
      if (!event.target.closest("#progress-body")) return;
      handleProgressInput(event.target, true);
    });

    document.addEventListener("focusout", function (event) {
      if (!event.target || !event.target.classList || !event.target.classList.contains("val-input")) return;
      if (!event.target.closest("#progress-body")) return;
      handleProgressInput(event.target, true);
    });

    document.addEventListener("keydown", function (event) {
      if (!event.target || !event.target.classList || !event.target.classList.contains("val-input")) return;
      if (!event.target.closest("#progress-body")) return;
      if (event.key === "Enter") {
        event.preventDefault();
        handleProgressInput(event.target, true);
        event.target.blur();
      }
    });
  }

  function bindProgressDeleteButtons() {
    if (document.body.dataset.progressDeleteBound === "true") return;
    document.body.dataset.progressDeleteBound = "true";
    document.addEventListener("click", function (event) {
      var button = event.target.closest(".delete-progress-project");
      if (!button || !button.closest("#progress-body")) return;
      event.preventDefault();
      event.stopPropagation();

      var name = button.getAttribute("data-project") || "";
      var year = parseInt(button.getAttribute("data-year"), 10) || progressSelectedYear;
      if (!name) return;

      showAppConfirm({
        title: "删除产值台账项目",
        message: "确认要从" + year + "年产值台账中删除项目「" + name + "」吗？删除后，该项目本年度已填写的月度产值也会一并清除。",
        okText: "确认删除",
        cancelText: "取消",
        onConfirm: function () {
          removeProjectFromProgressYear(name, year);
        }
      });
    });
  }

  function addProjectToProgressYear(name, year) {
    if (!name || !getProjectByName(name)) {
      alert("请选择项目台账中已有的项目。");
      return;
    }
    var key = String(year);
    var list = ensureProgressYearProjects(year);
    if (list.indexOf(name) >= 0) {
      alert("该项目已在当前年份台账中。");
      return;
    }
    showAppConfirm({
      title: "添加产值台账项目",
      message: "确认要将项目「" + name + "」添加到" + year + "年产值台账吗？",
      okText: "确认添加",
      cancelText: "取消",
      onConfirm: function () {
        list.push(name);
        progressProjectsByYear[key] = list;
        saveProgressProjects();
        renderProgressTable();
      }
    });
  }

  function removeProjectFromProgressYear(name, year) {
    var key = String(year);
    var list = Array.isArray(progressProjectsByYear[key]) ? progressProjectsByYear[key] : ensureProgressYearProjects(year);
    progressProjectsByYear[key] = list.filter(function (item) { return item !== name; });
    delete progressData[getProjectProgressKey(name, year)];
    saveProgressProjects();
    saveProgressData();
    renderProgressTable();
  }

  function handleProgressInput(input, shouldRender) {
    if (!input) return;
    saveProgressInputValue(input);
    if (!shouldRender) return;
    var row = input.closest("tr[data-project]");
    var name = input.getAttribute("data-project");
    var year = parseInt(input.getAttribute("data-year"), 10);
    if (row && name && year) {
      updateRowComputed(row, name, year);
      updateTotalRows(year);
      updateProgressSummary();
      updateDashboard();
    }
    if (shouldRender) renderProgressTable();
  }

  function saveProgressInputValue(input) {
    var name = input.getAttribute("data-project");
    var year = parseInt(input.getAttribute("data-year"), 10);
    var month = parseInt(input.getAttribute("data-month"), 10);
    if (!name || !year || !month) return;
    var val = input.value.trim();
    var normalizedVal = val.replace(/,/g, "");
    var numVal = parseFloat(normalizedVal);

    var md = getProjectMonthlyData(name, year);
    if (val === "") {
      delete md[month];
      input.classList.remove("has-value");
    } else if (!isNaN(numVal)) {
      md[month] = numVal;
      input.classList.add("has-value");
    } else {
      delete md[month];
      input.classList.remove("has-value");
    }
    saveProgressData();
  }

  function updateRowComputed(row, name, year) {
    var yearTotal = getYearTotal(name, year);
    var priorTotal = getPriorYearTotal(name, year);
    var cumTotal = priorTotal + yearTotal;
    var cells = row.children;
    /* 找到本年累计列 - 在12个月之后 */
    var monthStartIdx = 4; /* col: project, contract, start, end */
    /* 历年产值列数 */
    var priorYears = [];
    for (var py = year - 1; py >= Math.max(year - 3, 2000); py--) priorYears.push(py);
    var yearTotalIdx = monthStartIdx + priorYears.length + 12 + 4; /* +4 季度列 */
    var quarterStartIdx = monthStartIdx + priorYears.length + 12;
    var cumIdx = yearTotalIdx + 1;
    var ratioIdx = cumIdx + 1;

    /* 更新季度合计 */
    var md = getProjectMonthlyData(name, year);
    for (var qi3 = 0; qi3 < 4; qi3++) {
      var qVal = 0;
      var qs = qi3 * 3 + 1;
      for (var qmi2 = 0; qmi2 < 3; qmi2++) {
        qVal += (md[qs + qmi2] || 0);
      }
      if (cells[quarterStartIdx + qi3]) cells[quarterStartIdx + qi3].textContent = qVal > 0 ? formatNum(qVal) : '—';
    }

    if (cells[yearTotalIdx]) cells[yearTotalIdx].textContent = yearTotal > 0 ? formatNum(yearTotal) : '—';
    if (cells[cumIdx]) cells[cumIdx].textContent = cumTotal > 0 ? formatNum(cumTotal) : '—';

    var contractYuan = 0;
    for (var i = 0; i < savedProjects.length; i++) {
      if (savedProjects[i] && savedProjects[i].name === name) {
        contractYuan = Math.round(Number(savedProjects[i].contract || 0) * 100000000);
        break;
      }
    }
    var ratio = contractYuan > 0 ? (cumTotal / contractYuan * 100).toFixed(1) : "0.0";
    if (cells[ratioIdx]) cells[ratioIdx].textContent = ratio + '%';
  }

  function updateTotalRows(year) {
    var tbody = document.getElementById("progress-body");
    if (!tbody) return;
    var rows = tbody.querySelectorAll("tr[data-project]");
    var monthTotals = {};
    var totalYearTotal = 0;
    var totalCumTotal = 0;

    /* 分组累计：重点项目 vs 其他项目 */
    var keyUndertake = { "集团公司名称承揽": 1, "联合体承揽": 1, "厦门公司承揽": 1 };
    var keyType = { "公建": 1, "房建": 1 };
    var keyMonthTotals = {};
    var otherMonthTotals = {};
    var keyYearTotal = 0, keyCumTotal = 0;
    var otherYearTotal = 0, otherCumTotal = 0;

    /* 季度合计 */
    var grandQuarterTotals = [0, 0, 0, 0];
    var keyQuarterTotals = [0, 0, 0, 0];
    var otherQuarterTotals = [0, 0, 0, 0];

    for (var i = 0; i < rows.length; i++) {
      var name = rows[i].getAttribute("data-project");
      var inputs = rows[i].querySelectorAll(".val-input");
      /* 查找该项目的承揽类型与项目类型以判断分组 */
      var proj = getProjectByName(name) || {};
      var isKey = !!(keyUndertake[proj.undertake] && keyType[proj.type]);
      var mt = isKey ? keyMonthTotals : otherMonthTotals;
      var qt = isKey ? keyQuarterTotals : otherQuarterTotals;
      for (var j = 0; j < inputs.length; j++) {
        var m = parseInt(inputs[j].getAttribute("data-month"), 10);
        var v = parseFloat(inputs[j].value) || 0;
        monthTotals[m] = (monthTotals[m] || 0) + v;
        mt[m] = (mt[m] || 0) + v;
      }
      /* 累计季度合计 */
      var md = getProjectMonthlyData(name, year);
      for (var qi4 = 0; qi4 < 4; qi4++) {
        var qSum = 0;
        var qStart = qi4 * 3 + 1;
        for (var qmi3 = 0; qmi3 < 3; qmi3++) {
          qSum += (md[qStart + qmi3] || 0);
        }
        grandQuarterTotals[qi4] += qSum;
        qt[qi4] += qSum;
      }
      var yt = getYearTotal(name, year);
      var ct = getPriorYearTotal(name, year) + yt;
      totalYearTotal += yt;
      totalCumTotal += ct;
      if (isKey) { keyYearTotal += yt; keyCumTotal += ct; }
      else { otherYearTotal += yt; otherCumTotal += ct; }
    }

    var allRows = tbody.querySelectorAll("tr");
    for (var k = 0; k < allRows.length; k++) {
      var rowEl = allRows[k];
      var cells = rowEl.children;
      var monthStartIdx = 4;
      var priorYears = [];
      for (var py = year - 1; py >= Math.max(year - 3, 2000); py--) priorYears.push(py);
      var quarterStartIdx = monthStartIdx + priorYears.length + 12;
      var ytIdx = quarterStartIdx + 4; /* +4 季度列 */
      var ctIdx = ytIdx + 1;

      if (rowEl.classList.contains("total-row") || rowEl.classList.contains("total-year")) {
        for (var m2 = 1; m2 <= 12; m2++) {
          var idx = monthStartIdx + priorYears.length + m2 - 1;
          if (cells[idx]) cells[idx].textContent = monthTotals[m2] > 0 ? formatNum(monthTotals[m2]) : '—';
        }
        for (var tqi2 = 0; tqi2 < 4; tqi2++) {
          if (cells[quarterStartIdx + tqi2]) cells[quarterStartIdx + tqi2].textContent = grandQuarterTotals[tqi2] > 0 ? formatNum(grandQuarterTotals[tqi2]) : '—';
        }
        if (cells[ytIdx]) cells[ytIdx].textContent = totalYearTotal > 0 ? formatNum(totalYearTotal) : '—';
        if (cells[ctIdx]) cells[ctIdx].textContent = totalCumTotal > 0 ? formatNum(totalCumTotal) : '—';
      } else if (rowEl.classList.contains("group-subtotal")) {
        var group = rowEl.getAttribute("data-group");
        var gmt = group === "key" ? keyMonthTotals : otherMonthTotals;
        var gqt = group === "key" ? keyQuarterTotals : otherQuarterTotals;
        var gyt = group === "key" ? keyYearTotal : otherYearTotal;
        var gct = group === "key" ? keyCumTotal : otherCumTotal;
        for (var m3 = 1; m3 <= 12; m3++) {
          var gidx = monthStartIdx + priorYears.length + m3 - 1;
          if (cells[gidx]) cells[gidx].textContent = gmt[m3] > 0 ? formatNum(gmt[m3]) : '—';
        }
        for (var sqi2 = 0; sqi2 < 4; sqi2++) {
          if (cells[quarterStartIdx + sqi2]) cells[quarterStartIdx + sqi2].textContent = gqt[sqi2] > 0 ? formatNum(gqt[sqi2]) : '—';
        }
        if (cells[ytIdx]) cells[ytIdx].textContent = gyt > 0 ? formatNum(gyt) : '—';
        if (cells[ctIdx]) cells[ctIdx].textContent = gct > 0 ? formatNum(gct) : '—';
      }
    }
  }

  function formatNum(n) {
    return Math.round(Number(n || 0)).toLocaleString("zh-CN");
  }
  function escapeAttr(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function addProjectToProgress(data) {
    renderProgressTable();
  }

  function initProgressView() {
    loadProgressData();
    loadProgressProjects();
    var yearSelect = document.getElementById("progress-year-select");
    if (yearSelect) {
      yearSelect.value = String(progressSelectedYear);
      yearSelect.addEventListener("change", function () {
        progressSelectedYear = parseInt(this.value, 10) || new Date().getFullYear();
        renderProgressTable();
      });
    }
    var addBtn = document.getElementById("progress-add-project-btn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        var name = progressSelectedProject || "";
        addProjectToProgressYear(name, progressSelectedYear);
      });
    }
    /* 自定义下拉组件展开/收起 */
    var csTrigger = document.getElementById("progress-project-select-trigger");
    var csWrapper = document.getElementById("progress-project-select-wrapper");
    if (csTrigger && csWrapper && !csTrigger.dataset.bound) {
      csTrigger.dataset.bound = "true";
      csTrigger.addEventListener("click", function () {
        if (csTrigger.disabled) return;
        csWrapper.classList.toggle("open");
        csTrigger.setAttribute("aria-expanded", csWrapper.classList.contains("open") ? "true" : "false");
      });
      document.addEventListener("click", function (e) {
        if (!csWrapper.contains(e.target)) {
          csWrapper.classList.remove("open");
          csTrigger.setAttribute("aria-expanded", "false");
        }
      });
    }
    var exportBtn = document.getElementById("progress-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportProgressToCSV);
    }
    renderProgressTable();
  }

  function exportProgressToCSV() {
    var year = progressSelectedYear;
    var priorYears = [];
    for (var py = year - 1; py >= Math.max(year - 3, 2000); py--) priorYears.push(py);

    var headers = ["承接工程名称", "签订合同额(元)", "开工时间", "竣工时间"];
    for (var pi = 0; pi < priorYears.length; pi++) headers.push(priorYears[pi] + "年已完产值(元)");
    for (var m = 1; m <= 12; m++) headers.push(m + "月");
    headers.push("一季度", "二季度", "三季度", "四季度");
    headers.push("本年累计", "开工至报告期累计完成总产值", "累计完成比例", "状态");

    var csvRows = ["\uFEFF" + headers.join(",")];
    var yearProjects = getProgressProjectsForYear(year);
    for (var i = 0; i < yearProjects.length; i++) {
      var proj = yearProjects[i];
      if (!proj || !proj.name) continue;
      var contractYuan = Math.round(Number(proj.contract || 0) * 100000000);
      var priorTotal = getPriorYearTotal(proj.name, year);
      var yearTotal = getYearTotal(proj.name, year);
      var cumTotal = priorTotal + yearTotal;
      var ratio = contractYuan > 0 ? (cumTotal / contractYuan * 100).toFixed(1) + "%" : "0.0%";
      var row = ['"' + proj.name.replace(/"/g, '""') + '"', contractYuan, proj.startDate || "", proj.endDate || ""];
      for (var pi2 = 0; pi2 < priorYears.length; pi2++) row.push(getYearTotal(proj.name, priorYears[pi2]));
      var md = getProjectMonthlyData(proj.name, year);
      for (var m2 = 1; m2 <= 12; m2++) row.push(md[m2] || 0);
      for (var qi5 = 0; qi5 < 4; qi5++) {
        var qTotal = 0;
        var qStart2 = qi5 * 3 + 1;
        for (var qmi4 = 0; qmi4 < 3; qmi4++) qTotal += (md[qStart2 + qmi4] || 0);
        row.push(qTotal);
      }
      row.push(yearTotal, cumTotal, ratio, proj.status || "");
      csvRows.push(row.join(","));
    }

    var blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = year + "年产值进度台账.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function updateProgressSummary() {
    renderProgressTable();
  }

  function readDrafts() {
    try {
      projectDrafts = JSON.parse(localStorage.getItem(draftStorageKey) || "[]");
      if (!Array.isArray(projectDrafts)) projectDrafts = [];
    } catch (error) {
      projectDrafts = [];
    }
  }

  function writeDrafts() {
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(projectDrafts));
    } catch (error) {
      // 原型中忽略浏览器本地存储异常
    }
  }

  function collectProjectFormData() {
    var data = {};
    if (!newProjectForm) return data;
    Array.prototype.slice.call(newProjectForm.elements).forEach(function (field) {
      if (!field.name) return;
      if (field.type === "file") {
        data[field.name] = field.files && field.files.length ? field.files[0].name : "";
        return;
      }
      data[field.name] = field.value;
    });
    ["contract", "completed"].forEach(function (key) {
      if (data[key]) data[key] = formatNumberSix(data[key]) + "万";
    });
    ["buildingArea"].forEach(function (key) {
      if (data[key]) data[key] = formatNumberTwo(data[key]);
    });
    return data;
  }

  function bindTwoDecimalInputs() {
    if (!newProjectForm) return;
    ["contract", "completed"].forEach(function (name) {
      var input = newProjectForm.elements[name];
      if (!input || input.dataset.twoDecimalBound === "true") return;
      input.dataset.twoDecimalBound = "true";
      input.addEventListener("blur", function () {
        if (input.value !== "") input.value = formatNumberSix(input.value);
      });
    });
    ["buildingArea"].forEach(function (name) {
      var input = newProjectForm.elements[name];
      if (!input || input.dataset.twoDecimalBound === "true") return;
      input.dataset.twoDecimalBound = "true";
      input.addEventListener("blur", function () {
        if (input.value !== "") input.value = formatNumberTwo(input.value);
      });
    });
  }

  function setProjectFormMode(mode) {
    var isEdit = mode === "edit";
    if (projectModalTitle) projectModalTitle.textContent = isEdit ? "编辑项目详细信息" : "新建项目详细信息";
    if (projectModalDesc) {
      projectModalDesc.textContent = isEdit
        ? "修改后点击“保存”，将直接更新当前项目。"
        : "新项目可通过此表单录入；点击“保存”后直接加入项目台账。";
    }
    if (saveProjectDraftButton) {
      saveProjectDraftButton.style.removeProperty("display");
      saveProjectDraftButton.textContent = "保存";
    }
    if (projectFormSubmit) projectFormSubmit.style.display = "none";
  }

  function ensureProjectSaveButtonVisible() {
    if (!saveProjectDraftButton) return;
    saveProjectDraftButton.style.removeProperty("display");
    saveProjectDraftButton.textContent = "保存";
  }

  function resetProjectForm() {
    if (!newProjectForm) return;
    Array.prototype.slice.call(newProjectForm.querySelectorAll("input:not([type='submit']):not([type='button']):not([type='file']), textarea")).forEach(function (field) {
      field.value = "";
    });
    newProjectForm.reset();
    newProjectForm.dataset.draftId = "";
    newProjectForm.dataset.editUid = "";
    setProjectFormMode("create");
    bindTwoDecimalInputs();
    if (recognitionStatus) recognitionStatus.textContent = "";
  }

  function populateProjectForm(data) {
    if (!newProjectForm) return;
    resetProjectForm();
    Object.keys(data || {}).forEach(function (key) {
      if (newProjectForm.elements[key]) newProjectForm.elements[key].value = data[key] || "";
    });
    ["contract", "completed"].forEach(function (key) {
      if (newProjectForm.elements[key] && newProjectForm.elements[key].value !== "") {
        newProjectForm.elements[key].value = formatNumberSix(Number(newProjectForm.elements[key].value) * 10000);
      }
    });
    ["buildingArea"].forEach(function (key) {
      if (newProjectForm.elements[key] && newProjectForm.elements[key].value !== "") {
        newProjectForm.elements[key].value = formatNumberTwo(newProjectForm.elements[key].value);
      }
    });
    newProjectForm.dataset.draftId = data && data.draftId ? data.draftId : "";
    newProjectForm.dataset.editUid = data && data.uid ? data.uid : "";
    setProjectFormMode(data && data.uid ? "edit" : "create");
    bindTwoDecimalInputs();
  }

  function removeDraft(draftId) {
    projectDrafts = projectDrafts.filter(function (item) {
      return item.draftId !== draftId;
    });
    writeDrafts();
    renderProjectDrafts();
  }

  function renderProjectDrafts() {
    if (!projectDraftBox || !projectDraftList) return;
    projectDraftBox.classList.toggle("open", projectDrafts.length > 0);
    if (projectDraftCount) projectDraftCount.textContent = projectDrafts.length + "项";
    projectDraftList.innerHTML = "";

    projectDrafts.forEach(function (draft) {
      var card = document.createElement("div");
      card.className = "draft-card";
      card.innerHTML =
        "<div class=\"draft-info\"><strong>" + escapeHtml(draft.name || "未命名项目") + "</strong>" +
        "<span>" + escapeHtml(draft.undertake || "未选择承揽类型") + " · " + escapeHtml(draft.type || "未选择项目类型") + " · " + escapeHtml(draft.status || "未选择状态") + " · 最后保存：" + escapeHtml(draft.savedAt || "刚刚") + "</span></div>" +
        "<div class=\"draft-actions\">" +
        "<button class=\"btn\" type=\"button\" data-draft-action=\"edit\" data-draft-id=\"" + escapeHtml(draft.draftId) + "\">编辑</button>" +
        "<button class=\"btn\" type=\"button\" data-draft-action=\"delete\" data-draft-id=\"" + escapeHtml(draft.draftId) + "\">删除</button>" +
        "<button class=\"btn primary\" type=\"button\" data-draft-action=\"create\" data-draft-id=\"" + escapeHtml(draft.draftId) + "\">创建并加入台账</button>" +
        "</div>";
      projectDraftList.appendChild(card);
    });
  }

  function saveCurrentProjectDraft() {
    if (!newProjectForm) return;
    var data = collectProjectFormData();
    var draftId = newProjectForm.dataset.draftId || ("draft-" + Date.now());
    data.draftId = draftId;
    data.name = data.name || "未命名项目";
    data.savedAt = new Date().toLocaleString("zh-CN", { hour12: false });

    var existingIndex = projectDrafts.findIndex(function (item) {
      return item.draftId === draftId;
    });
    if (existingIndex >= 0) {
      projectDrafts[existingIndex] = data;
    } else {
      projectDrafts.unshift(data);
    }
    writeDrafts();
    renderProjectDrafts();
    activate("projects");
    closeModal(projectModal);
    resetProjectForm();
  }

  function saveProjectFormChanges() {
    if (!newProjectForm) return false;
    var data = collectProjectFormData();
    if (!data.name) return false;
    if (newProjectForm.dataset.editUid) {
      data.uid = newProjectForm.dataset.editUid;
      saveProjectToStorage(data);
      renderSavedProjects();
    } else {
      addProjectToLedger(data);
    }
    if (newProjectForm.dataset.draftId) {
      removeDraft(newProjectForm.dataset.draftId);
    }
    activate("projects");
    closeModal(projectModal);
    resetProjectForm();
    return true;
  }

  function requestProjectModalClose() {
    if (!projectModal || !projectModal.classList.contains("open")) return;
    if (newProjectForm && newProjectForm.dataset.editUid) {
      openModal(projectCloseConfirmModal);
      return;
    }
    closeModal(projectModal);
    resetProjectForm();
  }

  function addProjectToLedger(data, options) {
    if (!projectLedgerBody) return;
    options = options || {};
    data = options.persist === false ? normalizeProjectData(data) : saveProjectToStorage(data);
    var id = "project-detail-" + data.uid;
    var percent = calcPercent(data.completed, data.contract);
    var completedAmount = formatAmountWanFromYi(data.completed);
    var contractAmount = formatAmountWanFromYi(data.contract);
    var mainRow = document.createElement("tr");
    mainRow.className = "project-main-row";
    mainRow.setAttribute("data-detail", id);
    mainRow.setAttribute("data-project", data.name || "");
    mainRow.setAttribute("data-uid", data.uid || "");
    mainRow.innerHTML =
      "<td>" + escapeHtml(data.name) + "</td>" +
      "<td>" + escapeHtml(data.undertake) + "</td>" +
      "<td>" + escapeHtml(data.type) + "</td>" +
      "<td>" + contractAmount + "</td>" +
      "<td>" + escapeHtml(data.startDate) + "</td>" +
      "<td>" + escapeHtml(data.endDate) + "</td>" +
      "<td>" + escapeHtml(data.manager) + "</td>" +
      "<td><span class=\"mini-bar\"><i style=\"--value: " + percent + "%\"></i></span>" + percent + "%</td>" +
      "<td>" + projectStatusSelectHtml(data.status) + "</td>" +
      "<td><span class=\"row-actions\"><button class=\"btn btn-sm\" type=\"button\" data-edit-project>编辑</button><button class=\"btn btn-sm\" type=\"button\" data-delete-project>删除</button></span></td>";

    var detailRow = document.createElement("tr");
    var contractPeriod = (data.contractStart && data.contractEnd)
      ? (escapeHtml(data.contractStart) + " ~ " + escapeHtml(data.contractEnd))
      : "—";
    detailRow.innerHTML =
      "<td class=\"expand-cell\" colspan=\"10\"><div class=\"project-detail\" id=\"" + id + "\"><div class=\"detail-grid\">" +
      "<div class=\"detail-card\"><span>项目名称</span><strong>" + escapeHtml(data.name) + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目承揽类型</span><strong>" + escapeHtml(data.undertake) + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目类型</span><strong>" + escapeHtml(data.type) + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目状态</span><strong>" + escapeHtml(data.status) + "</strong></div>" +
      "<div class=\"detail-card\"><span>合同金额</span><strong>" + contractAmount + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目完成总产值</span><strong>" + completedAmount + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目完成比例</span><strong>" + completedAmount + " / " + contractAmount + " = " + percent + "%</strong></div>" +
      "<div class=\"detail-card\"><span>发包人</span><strong>" + escapeHtml(data.owner) + "</strong></div>" +
      "<div class=\"detail-card\"><span>承包人</span><strong>" + escapeHtml(data.contractor) + "</strong></div>" +
      "<div class=\"detail-card\"><span>投标项目经理</span><strong>" + escapeHtml(data.bidManager) + "</strong></div>" +
      "<div class=\"detail-card\"><span>投标技术负责人</span><strong>" + escapeHtml(data.bidTech) + "</strong></div>" +
      "<div class=\"detail-card\"><span>建筑面积</span><strong>" + escapeHtml(data.buildingArea ? data.buildingArea + " ㎡" : "—") + "</strong></div>" +
      "<div class=\"detail-card\"><span>所属区域</span><strong>" + escapeHtml(data.area) + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目地点</span><strong>" + escapeHtml(data.location) + "</strong></div>" +
      "<div class=\"detail-card\"><span>合同工期</span><strong>" + contractPeriod + "</strong></div>" +
      "<div class=\"detail-card\"><span>实际开工日期</span><strong>" + escapeHtml(data.startDate || "—") + "</strong></div>" +
      "<div class=\"detail-card\"><span>计划竣工日期</span><strong>" + escapeHtml(data.endDate || "—") + "</strong></div>" +
      "<div class=\"detail-card\"><span>实际项目经理</span><strong>" + escapeHtml(data.manager) + "</strong></div>" +
      "<div class=\"detail-card\"><span>当前关键节点</span><strong>" + escapeHtml(data.milestone) + "</strong></div>" +
      "<div class=\"detail-card\"><span>项目概况</span><strong>" + escapeHtml(data.overview) + "</strong></div>" +
      "<div class=\"detail-card\"><span>风险说明</span><strong>" + escapeHtml(data.risk || "—") + "</strong></div>" +
      "<div class=\"detail-card\"><span>立项或合同截图/附件</span><strong>" + escapeHtml(data.attachment || "—") + "</strong></div>" +
      "<div class=\"detail-card\"><span>备注</span><strong>" + escapeHtml(data.remark) + "</strong></div>" +
      "</div></div></td>";

    projectLedgerBody.insertBefore(detailRow, projectLedgerBody.firstChild);
    projectLedgerBody.insertBefore(mainRow, detailRow);
    bindProjectRow(mainRow);
    bindProjectStatusSelect(mainRow.querySelector("[data-project-status]"));
    addProjectToOrg(data);
    addProjectToProgress(data);

    /* 新增/编辑项目后按承揽类型、项目类型排序重新渲染 */
    if (options.persist !== false) {
      renderSavedProjects();
      return;
    }

    applyProjectFilters();
    updateOrgSummary();
    updateProgressSummary();
    updateDashboard();
  }

  function addProjectToOrg(data) {
    var orgBody = document.getElementById("org-body");
    if (!orgBody) return;
    var row = document.createElement("tr");
    row.setAttribute("data-project", data.name || "");
    row.setAttribute("data-uid", data.uid || "");
    row.innerHTML =
      "<td>" + escapeHtml(data.name || "") + "</td>" +
      "<td>" + escapeHtml(data.manager || data.bidManager || "—") + "</td>" +
      "<td><select class=\"table-select\" data-init-status><option>未完成</option><option>已完成</option></select></td>" +
      "<td><span class=\"date-cell\"><input type=\"date\" class=\"table-select\" value=\"\"><em class=\"date-empty-text\">未确认</em></span></td>" +
      "<td><select class=\"table-select\" data-org-status><option>未组建</option><option>已提交未上会</option><option>已组建</option></select></td>" +
      "<td><div class=\"upload-cell\"><span class=\"file-pill\" data-file-name>待上传组建资料</span><label class=\"upload-btn\">上传资料<input type=\"file\" data-org-upload></label></div></td>" +
      "<td><select class=\"table-select\" data-contract-status><option>未签订</option><option>已签订</option></select></td>" +
      "<td>0.00万</td>" +
      "<td><button class=\"link-button\" data-modal=\"deposit-modal\" data-project=\"" + escapeHtml(data.name || "") + "\">查看明细</button></td>" +
      "<td><span class=\"badge gray\">未缴清</span></td>" +
      "<td>由项目台账同步生成</td>";
    orgBody.appendChild(row);
    restoreOrgRowState(row);
    bindOrgControls(row);
  }

  function deleteProjectFromLedger(row) {
    if (!row) return;
    var projectName = row.getAttribute("data-project") || (row.children[0] ? row.children[0].textContent.trim() : "");
    var uid = row.getAttribute("data-uid") || "";
    if (!projectName) return;

    showAppConfirm({
      title: "删除项目台账项目",
      message: "确认要删除项目台账中的「" + projectName + "」吗？",
      okText: "确认删除",
      cancelText: "取消",
      onConfirm: function () {
        continueDeleteProjectFromLedger(row, projectName, uid);
      }
    });
  }

  function continueDeleteProjectFromLedger(row, projectName, uid) {
    var detailId = row.getAttribute("data-detail");
    var detail = detailId ? document.getElementById(detailId) : null;
    var detailRow = detail ? detail.closest("tr") : null;

    var hasProgressData = false;
    for (var key in progressData) {
      if (key.indexOf(projectName + "|") === 0) { hasProgressData = true; break; }
    }
    var inProgressYears = [];
    Object.keys(progressProjectsByYear).forEach(function (yearKey) {
      if (Array.isArray(progressProjectsByYear[yearKey]) && progressProjectsByYear[yearKey].indexOf(projectName) >= 0) {
        inProgressYears.push(yearKey);
      }
    });

    if (hasProgressData || inProgressYears.length > 0) {
      showAppConfirm({
        title: "同步删除产值数据",
        message: "该项目在产值进度台账中存在数据，是否同步删除产值进度台账中的相关数据？选择“同步删除”将删除所有年份的产值数据；选择“保留产值”则只删除项目台账中的项目。",
        okText: "同步删除",
        cancelText: "保留产值",
        onConfirm: function () {
          finishDeleteProjectFromLedger(row, detailRow, projectName, uid, true);
        },
        onCancel: function () {
          finishDeleteProjectFromLedger(row, detailRow, projectName, uid, false);
        }
      });
      return;
    }

    finishDeleteProjectFromLedger(row, detailRow, projectName, uid, false);
  }

  function finishDeleteProjectFromLedger(row, detailRow, projectName, uid, syncDeleteProgress) {
    if (detailRow) detailRow.remove();
    if (row) row.remove();

    if (syncDeleteProgress) {
      var keysToRemove = [];
      for (var key2 in progressData) {
        if (key2.indexOf(projectName + "|") === 0) keysToRemove.push(key2);
      }
      keysToRemove.forEach(function (k) { delete progressData[k]; });
      Object.keys(progressProjectsByYear).forEach(function (yearKey) {
        if (Array.isArray(progressProjectsByYear[yearKey])) {
          progressProjectsByYear[yearKey] = progressProjectsByYear[yearKey].filter(function (name) { return name !== projectName; });
        }
      });
      saveProgressData();
      saveProgressProjects();
    }

    Array.prototype.slice.call(document.querySelectorAll("#org-body tr")).forEach(function (orgRow) {
      var orgName = orgRow.getAttribute("data-project") || (orgRow.children[0] ? orgRow.children[0].textContent.trim() : "");
      if ((uid && orgRow.getAttribute("data-uid") === uid) || orgName === projectName) orgRow.remove();
    });

    savedProjects = savedProjects.filter(function (project) {
      return (uid && project.uid !== uid) || (!uid && project.name !== projectName);
    });
    writeSavedProjects();

    applyProjectFilters();
    updateOrgSummary();
    updateProgressSummary();
    updateDashboard();
  }

  function clearProjectLinkedTables() {
    if (projectLedgerBody) projectLedgerBody.innerHTML = "";
    var orgBody = document.getElementById("org-body");
    if (orgBody) orgBody.innerHTML = "";
    var progressBody = document.getElementById("progress-body");
    if (progressBody) progressBody.innerHTML = "";
  }

  function renderSavedProjects() {
    clearProjectLinkedTables();
    var undertakeOrder = { "集团公司名称承揽": 0, "联合体承揽": 1, "厦门公司承揽": 2 };
    var typeOrder = { "公建": 0, "房建": 1, "机电": 2, "其他": 3 };
    var sorted = savedProjects.slice().sort(function (a, b) {
      var ua = undertakeOrder[a.undertake] != null ? undertakeOrder[a.undertake] : 99;
      var ub = undertakeOrder[b.undertake] != null ? undertakeOrder[b.undertake] : 99;
      if (ua !== ub) return ua - ub;
      var ta = typeOrder[a.type] != null ? typeOrder[a.type] : 99;
      var tb = typeOrder[b.type] != null ? typeOrder[b.type] : 99;
      if (ta !== tb) return ta - tb;
      /* 前两个条件相同时，按实际开工日期排序（早的在前） */
      var da = a.startDate ? new Date(a.startDate).getTime() : Infinity;
      var db = b.startDate ? new Date(b.startDate).getTime() : Infinity;
      return da - db;
    });
    sorted.forEach(function (project) {
      addProjectToLedger(project, { persist: false });
    });
    /* addProjectToLedger 内部用 insertBefore(firstChild) 逐条插到最前面，
       导致 DOM 顺序与 sorted 数组相反，需要反转后再按正确顺序重排 */
    var allRows = Array.prototype.slice.call(projectLedgerBody.querySelectorAll(".project-main-row"));
    allRows.reverse().forEach(function (row) {
      var detail = row.nextElementSibling;
      projectLedgerBody.appendChild(row);
      if (detail) projectLedgerBody.appendChild(detail);
    });
    applyProjectFilters();
    updateOrgSummary();
    updateProgressSummary();
    updateDashboard();
  }

  navButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activate(button.getAttribute("data-view"));
    });
  });

  if (search) {
    search.addEventListener("input", function () {
      var keyword = search.value.trim().toLowerCase();
      var activeView = document.querySelector(".view.active");
      if (!activeView) return;

      if (activeView.id === "projects") {
        applyProjectFilters();
        return;
      }

      Array.prototype.slice.call(activeView.querySelectorAll("tbody tr")).forEach(function (row) {
        if (row.querySelector(".project-detail")) return;
        var matched = !keyword || row.textContent.toLowerCase().indexOf(keyword) >= 0;
        row.style.display = matched ? "" : "none";
      });
    });
  }

  projectFilterControls.forEach(function (control) {
    control.addEventListener("input", applyProjectFilters);
    control.addEventListener("change", applyProjectFilters);
  });

  Array.prototype.slice.call(document.querySelectorAll(".project-main-row[data-detail]")).forEach(bindProjectRow);

  if (projectLedgerBody) {
    projectLedgerBody.addEventListener("click", function (event) {
      var editButton = event.target.closest("[data-edit-project]");
      if (editButton) {
        var editRow = editButton.closest(".project-main-row");
        var uid = editRow ? editRow.getAttribute("data-uid") : "";
        var name = editRow && editRow.children[0] ? editRow.children[0].textContent.trim() : "";
        var project = savedProjects.find(function (item) {
          return (uid && item.uid === uid) || item.name === name;
        });
        if (project) {
          populateProjectForm(project);
          ensureProjectSaveButtonVisible();
          openModal(projectModal);
        }
        return;
      }
      var deleteButton = event.target.closest("[data-delete-project]");
      if (!deleteButton) return;
      var row = deleteButton.closest(".project-main-row");
      deleteProjectFromLedger(row);
    });
  }

  if (openProjectModalButton) {
    openProjectModalButton.addEventListener("click", function () {
      resetProjectForm();
      ensureProjectSaveButtonVisible();
      openModal(projectModal);
    });
  }

  if (recognizeButton && newProjectForm) {
    var screenshotInput = document.getElementById("project-screenshot");

    function extractField(text, patterns) {
      for (var i = 0; i < patterns.length; i++) {
        var match = text.match(patterns[i]);
        if (match && match[1]) return match[1].trim();
      }
      return "";
    }

    function extractAmount(text) {
      var patterns = [
        /合同[金额|总价|价款][^\d]*([\d,.]+)\s*[亿万]/,
        /中标[金额|价格|价][^\d]*([\d,.]+)\s*[亿万]/,
        /金额[^\d]*([\d,.]+)\s*[亿万]/,
        /[总造][价金额][^\d]*([\d,.]+)\s*[亿万]/,
        /([\d,.]+)\s*[亿万]元?/
      ];
      for (var i = 0; i < patterns.length; i++) {
        var match = text.match(patterns[i]);
        if (match && match[1]) {
          var num = match[1].replace(/,/g, "");
          var unit = text.substring(match.index, match.index + 30).match(/亿|万/);
          if (unit && unit[0] === "万") {
            return (parseFloat(num) / 10000).toFixed(2);
          }
          return parseFloat(num).toFixed(2);
        }
      }
      return "";
    }

    function extractDate(text, keyword) {
      var patterns = [
        new RegExp(keyword + "[^\\d]*(20\\d{2})[年/\\-](\\d{1,2})[月/\\-](\\d{1,2})"),
        new RegExp(keyword + "[^\\d]*(20\\d{2})[\\.](\\d{1,2})[\\.](\\d{1,2})")
      ];
      for (var i = 0; i < patterns.length; i++) {
        var match = text.match(patterns[i]);
        if (match) {
          return match[1] + "-" + match[2].padStart(2, "0") + "-" + match[3].padStart(2, "0");
        }
      }
      return "";
    }

    function extractArea(text) {
      var provinces = ["北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "台湾", "香港", "澳门"];
      for (var i = 0; i < provinces.length; i++) {
        if (text.indexOf(provinces[i]) >= 0) {
          var fullName = provinces[i];
          if (provinces[i] === "内蒙古") fullName = "内蒙古自治区";
          else if (provinces[i] === "广西") fullName = "广西壮族自治区";
          else if (provinces[i] === "宁夏") fullName = "宁夏回族自治区";
          else if (provinces[i] === "新疆") fullName = "新疆维吾尔自治区";
          else if (provinces[i] === "西藏") fullName = "西藏自治区";
          else if (["北京", "天津", "上海", "重庆"].indexOf(provinces[i]) >= 0) fullName = provinces[i] + "市";
          else fullName = provinces[i] + "省";
          return fullName;
        }
      }
      return "";
    }

    function findProjectType(text) {
      var types = ["房建", "公建", "市政", "改造", "装饰装修", "机电", "消防"];
      for (var i = 0; i < types.length; i++) {
        if (text.indexOf(types[i]) >= 0) return types[i];
      }
      return "";
    }

    function fillFormFromText(rawText) {
      var text = rawText.replace(/\s+/g, " ");
      var fields = {};

      var namePatterns = [
        /项目名称[：:\s]*([^，。;\n]{4,30})/,
        /工程名称[：:\s]*([^，。;\n]{4,30})/,
        /([^，。;\n]{6,30}(?:工程|项目|改造|提升|建设))/
      ];
      fields.name = extractField(text, namePatterns);

      var ownerPatterns = [
        /发包人[：:\s]*([^，。;\n]{4,30})/,
        /建设单位[：:\s]*([^，。;\n]{4,30})/,
        /甲方[：:\s]*([^，。;\n]{4,30})/,
        /招标人[：:\s]*([^，。;\n]{4,30})/
      ];
      fields.owner = extractField(text, ownerPatterns);

      var contractorPatterns = [
        /承包人[：:\s]*([^，。;\n]{4,30})/,
        /施工单位[：:\s]*([^，。;\n]{4,30})/,
        /乙方[：:\s]*([^，。;\n]{4,30})/,
        /中标人[：:\s]*([^，。;\n]{4,30})/
      ];
      fields.contractor = extractField(text, contractorPatterns);

      var managerPatterns = [
        /项目经理[：:\s]*([^\s，。;]{2,5})/,
        /项目负责人[：:\s]*([^\s，。;]{2,5})/
      ];
      fields.manager = extractField(text, managerPatterns);
      fields.bidManager = fields.manager;

      var techPatterns = [
        /技术负责人[：:\s]*([^\s，。;]{2,5})/,
        /技术主管[：:\s]*([^\s，。;]{2,5})/
      ];
      fields.bidTech = extractField(text, techPatterns);

      var areaPatterns = [
        /建筑面积[：:\s]*([\d,.]+)\s*[平㎡方]?/,
        /面积[：:\s]*([\d,.]+)\s*[平㎡方]?/
      ];
      var areaVal = extractField(text, areaPatterns);
      if (areaVal) fields.buildingArea = areaVal.replace(/\./g, "");

      var locationPatterns = [
        /项目地点[：:\s]*([^，。;\n]{4,30})/,
        /工程地点[：:\s]*([^，。;\n]{4,30})/,
        /地址[：:\s]*([^，。;\n]{4,30})/
      ];
      fields.location = extractField(text, locationPatterns);

      fields.area = extractArea(text);
      var pType = findProjectType(text);
      if (pType) fields.type = pType;

      fields.contract = extractAmount(text);

      fields.contractStart = extractDate(text, "开工日期") || extractDate(text, "合同开工") || extractDate(text, "开工");
      fields.contractEnd = extractDate(text, "竣工日期") || extractDate(text, "合同竣工") || extractDate(text, "竣工") || extractDate(text, "完工");
      fields.startDate = extractDate(text, "实际开工");

      var count = 0;
      Object.keys(fields).forEach(function (key) {
        if (fields[key] && newProjectForm.elements[key]) {
          newProjectForm.elements[key].value = fields[key];
          count++;
        }
      });
      return count;
    }

    recognizeButton.addEventListener("click", function () {
      if (!screenshotInput || !screenshotInput.files || !screenshotInput.files.length) {
        if (recognitionStatus) {
          recognitionStatus.textContent = "请先上传截图文件";
          recognitionStatus.style.color = "var(--danger)";
        }
        return;
      }

      var file = screenshotInput.files[0];
      if (recognitionStatus) {
        recognitionStatus.textContent = "正在识别中，请稍候...";
        recognitionStatus.style.color = "var(--accent)";
      }
      recognizeButton.disabled = true;

      if (typeof Tesseract === "undefined") {
        if (recognitionStatus) {
          recognitionStatus.textContent = "OCR引擎加载失败，请检查网络后重试";
          recognitionStatus.style.color = "var(--danger)";
        }
        recognizeButton.disabled = false;
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        Tesseract.recognize(e.target.result, "chi_sim+eng", {
          logger: function (m) {
            if (m.status === "recognizing text" && recognitionStatus) {
              recognitionStatus.textContent = "正在识别中... " + Math.round(m.progress * 100) + "%";
            }
          }
        }).then(function (result) {
          var rawText = result.data.text;
          var count = fillFormFromText(rawText);
          if (recognitionStatus) {
            if (count > 0) {
              recognitionStatus.textContent = "识别完成，已自动填入 " + count + " 个字段，请核对";
              recognitionStatus.style.color = "var(--success)";
            } else {
              recognitionStatus.textContent = "识别完成，但未能提取到有效字段，请手动填写";
              recognitionStatus.style.color = "var(--warn)";
            }
          }
          recognizeButton.disabled = false;
        }).catch(function (err) {
          if (recognitionStatus) {
            recognitionStatus.textContent = "识别失败：" + (err.message || "未知错误");
            recognitionStatus.style.color = "var(--danger)";
          }
          recognizeButton.disabled = false;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  var excelImportFile = document.getElementById("excel-import-file");
  var excelImportBtn = document.getElementById("excel-import-btn");
  var excelImportStatus = document.getElementById("excel-import-status");
  var excelPreviewWrap = document.getElementById("excel-preview-wrap");
  var excelPreviewHead = document.getElementById("excel-preview-head");
  var excelPreviewBody = document.getElementById("excel-preview-body");
  var excelImportAll = document.getElementById("excel-import-all");
  var excelImportCancel = document.getElementById("excel-import-cancel");
  var excelImportActions = document.getElementById("excel-import-actions");
  var excelParsedData = [];

  function normalizeHeader(h) {
    var s = String(h || "").replace(/[\s\n\r\t]+/g, "").toLowerCase();
    return s;
  }

  function mapExcelRow(headers, row) {
    var data = {};
    headers.forEach(function (h, i) {
      var val = row[i] !== undefined ? String(row[i] || "").trim() : "";
      var nh = normalizeHeader(h);
      if (nh.indexOf("项目名称") >= 0 || nh.indexOf("名称") >= 0 || nh === "name") data.name = val;
      else if (nh.indexOf("承揽") >= 0 || nh === "undertake") data.undertake = val;
      else if (nh.indexOf("项目类型") >= 0 || nh.indexOf("类型") >= 0 || nh === "type") data.type = val;
      else if (nh.indexOf("状态") >= 0 || nh === "status") data.status = val;
      else if (nh.indexOf("合同金额") >= 0 || nh.indexOf("金额") >= 0 || nh === "contract") data.contract = val;
      else if (nh.indexOf("完成") >= 0 && nh.indexOf("产值") >= 0) data.completed = val;
      else if (nh.indexOf("发包人") >= 0 || nh.indexOf("建设单位") >= 0) data.owner = val;
      else if (nh.indexOf("承包人") >= 0 || nh.indexOf("施工单位") >= 0) data.contractor = val;
      else if (nh.indexOf("投标项目经理") >= 0) data.bidManager = val;
      else if (nh.indexOf("项目经理") >= 0 || nh.indexOf("负责人") >= 0) data.manager = val;
      else if (nh.indexOf("技术负责人") >= 0) data.bidTech = val;
      else if (nh.indexOf("建筑") >= 0 && nh.indexOf("面积") >= 0) data.buildingArea = val;
      else if (nh.indexOf("区域") >= 0 || nh === "area") data.area = val;
      else if (nh.indexOf("地点") >= 0 || nh === "location") data.location = val;
      else if (nh.indexOf("合同开工") >= 0 || (nh.indexOf("开工") >= 0 && nh.indexOf("合同") >= 0)) data.contractStart = val;
      else if (nh.indexOf("合同竣工") >= 0 || (nh.indexOf("竣工") >= 0 && nh.indexOf("合同") >= 0)) data.contractEnd = val;
      else if (nh.indexOf("实际开工") >= 0) data.startDate = val;
      else if (nh.indexOf("计划竣工") >= 0) data.endDate = val;
      else if (nh.indexOf("关键节点") >= 0 || nh.indexOf("里程碑") >= 0) data.milestone = val;
      else if (nh.indexOf("概况") >= 0) data.overview = val;
      else if (nh.indexOf("风险") >= 0) data.risk = val;
      else if (nh.indexOf("备注") >= 0 || nh === "remark") data.remark = val;
    });
    if (!data.name) data.name = "";
    if (!data.undertake) data.undertake = "集团公司名称承揽";
    if (!data.status) data.status = "在建";
    if (!data.contract) data.contract = "0";
    if (!data.completed) data.completed = "0";
    return data;
  }

  function parseExcelDate(raw) {
    if (!raw) return "";
    var s = String(raw).trim();
    if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(s)) {
      return s.replace(/\//g, "-");
    }
    var num = parseFloat(s);
    if (!isNaN(num) && num > 40000 && num < 80000) {
      var d = new Date((num - 25569) * 86400 * 1000);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    return s;
  }

  if (excelImportBtn && excelImportFile) {
    excelImportBtn.addEventListener("click", function () {
      if (!excelImportFile.files || !excelImportFile.files.length) {
        if (excelImportStatus) {
          excelImportStatus.textContent = "请先选择 Excel 文件";
          excelImportStatus.style.color = "var(--danger)";
        }
        return;
      }
      if (typeof XLSX === "undefined") {
        if (excelImportStatus) {
          excelImportStatus.textContent = "Excel 解析库加载失败，请检查网络";
          excelImportStatus.style.color = "var(--danger)";
        }
        return;
      }

      var file = excelImportFile.files[0];
      if (excelImportStatus) {
        excelImportStatus.textContent = "正在解析中...";
        excelImportStatus.style.color = "var(--accent)";
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var workbook = XLSX.read(e.target.result, { type: "array" });
          var firstSheet = workbook.SheetNames[0];
          var sheet = workbook.Sheets[firstSheet];
          var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          if (!rows || rows.length < 2) {
            if (excelImportStatus) {
              excelImportStatus.textContent = "未检测到有效数据行，请检查文件内容";
              excelImportStatus.style.color = "var(--danger)";
            }
            return;
          }
          var headers = rows[0];
          excelParsedData = [];
          for (var r = 1; r < rows.length; r++) {
            if (!rows[r] || rows[r].every(function (c) { return String(c || "").trim() === ""; })) continue;
            var mapped = mapExcelRow(headers, rows[r]);
            if (mapped.name) excelParsedData.push(mapped);
          }

          if (excelParsedData.length === 0) {
            if (excelImportStatus) {
              excelImportStatus.textContent = "未检测到有效项目数据，请检查 Excel 列名与内容";
              excelImportStatus.style.color = "var(--danger)";
            }
            return;
          }

          var displayHeaders = ["项目名称", "承揽类型", "项目类型", "合同金额", "发包人", "承包人", "项目经理", "状态"];
          var fieldKeys = ["name", "undertake", "type", "contract", "owner", "contractor", "manager", "status"];
          excelPreviewHead.innerHTML = "<tr>" + displayHeaders.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr>";
          excelPreviewBody.innerHTML = "";
          for (var i = 0; i < excelParsedData.length; i++) {
            var row = excelParsedData[i];
            var td = fieldKeys.map(function (k) {
              return "<td>" + escapeHtml(row[k] || "—") + "</td>";
            }).join("");
            excelPreviewBody.innerHTML += "<tr>" + td + "</tr>";
          }

          excelPreviewWrap.style.display = "block";
          excelImportActions.style.display = "flex";
          if (excelImportStatus) {
            excelImportStatus.textContent = "解析完成，检测到 " + excelParsedData.length + " 个项目，请确认后导入";
            excelImportStatus.style.color = "var(--success)";
          }
        } catch (err) {
          if (excelImportStatus) {
            excelImportStatus.textContent = "解析失败：" + (err.message || "未知错误");
            excelImportStatus.style.color = "var(--danger)";
          }
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (excelImportAll) {
    excelImportAll.addEventListener("click", function () {
      if (!excelParsedData || excelParsedData.length === 0) return;
      var count = 0;
      excelParsedData.forEach(function (data) {
        data.contractStart = parseExcelDate(data.contractStart);
        data.contractEnd = parseExcelDate(data.contractEnd);
        data.startDate = parseExcelDate(data.startDate);
        data.endDate = parseExcelDate(data.endDate);
        addProjectToLedger(data);
        count++;
      });
      excelParsedData = [];
      excelPreviewBody.innerHTML = "";
      excelPreviewHead.innerHTML = "";
      excelPreviewWrap.style.display = "none";
      excelImportActions.style.display = "none";
      if (excelImportStatus) {
        excelImportStatus.textContent = "已成功导入 " + count + " 个项目到台账";
        excelImportStatus.style.color = "var(--success)";
      }
      excelImportFile.value = "";
      applyProjectFilters();
      updateDashboard();
      closeModal(projectModal);
    });
  }

  if (excelImportCancel) {
    excelImportCancel.addEventListener("click", function () {
      excelParsedData = [];
      excelPreviewBody.innerHTML = "";
      excelPreviewHead.innerHTML = "";
      excelPreviewWrap.style.display = "none";
      excelImportActions.style.display = "none";
      if (excelImportStatus) excelImportStatus.textContent = "";
      excelImportFile.value = "";
    });
  }

  if (projectDraftList) {
    projectDraftList.addEventListener("click", function (event) {
      var button = event.target.closest("[data-draft-action]");
      if (!button) return;
      var draftId = button.getAttribute("data-draft-id");
      var draft = projectDrafts.find(function (item) {
        return item.draftId === draftId;
      });
      if (!draft) return;

      if (button.getAttribute("data-draft-action") === "edit") {
        populateProjectForm(draft);
        ensureProjectSaveButtonVisible();
        openModal(projectModal);
      }

      if (button.getAttribute("data-draft-action") === "delete") {
        removeDraft(draftId);
      }

      if (button.getAttribute("data-draft-action") === "create") {
        addProjectToLedger(draft);
        removeDraft(draftId);
        activate("projects");
      }
    });
  }

  if (newProjectForm) {
    newProjectForm.addEventListener("submit", function (event) {
      event.preventDefault();
      saveProjectFormChanges();
    });
  }

  function bindOrgControls(scope) {
    scope = scope || document;
    function applyOrgSelectClass(select) {
      if (!select) return;
      select.className = "table-select";
      if (select.matches("[data-org-status]")) {
        if (select.value === "已组建") select.classList.add("success");
        else if (select.value === "已提交未上会") select.classList.add("warn");
        else select.classList.add("gray");
        return;
      }
      if (select.matches("[data-init-status]")) {
        select.classList.add(select.value === "已完成" ? "success" : "gray");
        return;
      }
      if (select.matches("[data-contract-status]")) {
        select.classList.add(select.value === "已签订" ? "success" : "gray");
      }
    }

    Array.prototype.slice.call(scope.querySelectorAll(".date-cell input[type=date]")).forEach(function (input) {
      if (input.dataset.bound === "true") return;
      input.dataset.bound = "true";
      function updateDateStatus() {
        var box = input.closest(".date-cell");
        if (!box) return;
        input.setAttribute("value", input.value);
        box.classList.toggle("confirmed", !!input.value);
        box.classList.toggle("empty", !input.value);
        updateDashboard();
        updateOrgSummary();
      }
      input.addEventListener("change", function () {
        updateDateStatus();
        var row = input.closest("tr");
        if (row) saveOrgRowState(row);
      });
      updateDateStatus();
    });

    Array.prototype.slice.call(scope.querySelectorAll("[data-org-status]")).forEach(function (select) {
      if (select.dataset.bound === "true") return;
      select.dataset.bound = "true";
      select.addEventListener("change", function () {
        applyOrgSelectClass(select);
        var row = select.closest("tr");
        if (row) saveOrgRowState(row);
        updateDashboard();
        updateOrgSummary();
      });
      applyOrgSelectClass(select);
    });

    Array.prototype.slice.call(scope.querySelectorAll("[data-init-status]")).forEach(function (select) {
      if (select.dataset.bound === "true") return;
      select.dataset.bound = "true";
      select.addEventListener("change", function () {
        applyOrgSelectClass(select);
        var row = select.closest("tr");
        if (row) saveOrgRowState(row);
        updateDashboard();
        updateOrgSummary();
      });
      applyOrgSelectClass(select);
    });

    Array.prototype.slice.call(scope.querySelectorAll("[data-contract-status]")).forEach(function (select) {
      if (select.dataset.bound === "true") return;
      select.dataset.bound = "true";
      select.addEventListener("change", function () {
        applyOrgSelectClass(select);
        var row = select.closest("tr");
        if (row) saveOrgRowState(row);
        updateDashboard();
        updateOrgSummary();
      });
      applyOrgSelectClass(select);
    });

    Array.prototype.slice.call(scope.querySelectorAll("[data-org-upload]")).forEach(function (input) {
      if (input.dataset.bound === "true") return;
      input.dataset.bound = "true";
      input.addEventListener("change", function () {
        var fileName = input.files && input.files.length ? input.files[0].name : "";
        var box = input.closest(".upload-cell");
        var label = box ? box.querySelector("[data-file-name]") : null;
        if (label && fileName) label.textContent = "已上传：" + fileName;
        var row = input.closest("tr");
        if (row) saveOrgRowState(row);
        updateOrgSummary();
      });
    });
  }

  /*
  Array.prototype.slice.call(document.querySelectorAll(".date-cell input[type=date]")).forEach(function (input) {
    function updateDateStatus() {
      var box = input.closest(".date-cell");
      if (!box) return;
      input.setAttribute("value", input.value);
      box.classList.toggle("confirmed", !!input.value);
      box.classList.toggle("empty", !input.value);
      updateDashboard();
      updateOrgSummary();
    }
    input.addEventListener("change", updateDateStatus);
    updateDateStatus();
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-org-status]")).forEach(function (select) {
    select.addEventListener("change", function () {
      var val = select.value;
      select.className = "table-select";
      if (val === "已组建") select.classList.add("success");
      else if (val === "已提交未上会") select.classList.add("warn");
      else select.classList.add("gray");
      updateDashboard();
      updateOrgSummary();
    });
    select.dispatchEvent(new Event("change"));
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-init-status]")).forEach(function (select) {
    select.addEventListener("change", function () {
      select.className = "table-select";
      select.classList.add(select.value === "已完成" ? "success" : "gray");
      updateDashboard();
      updateOrgSummary();
    });
    select.dispatchEvent(new Event("change"));
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-contract-status]")).forEach(function (select) {
    select.addEventListener("change", function () {
      select.className = "table-select";
      select.classList.add(select.value === "已签订" ? "success" : "gray");
      updateDashboard();
      updateOrgSummary();
    });
    select.dispatchEvent(new Event("change"));
  });

  Array.prototype.slice.call(document.querySelectorAll("[data-org-upload]")).forEach(function (input) {
    input.addEventListener("change", function () {
      var fileName = input.files && input.files.length ? input.files[0].name : "";
      var box = input.closest(".upload-cell");
      var label = box ? box.querySelector("[data-file-name]") : null;
      if (label && fileName) label.textContent = "已上传：" + fileName;
      updateOrgSummary();
    });
  });
  */

  var initial = window.location.hash ? window.location.hash.replace("#", "") : "dashboard";
  readDrafts();
  renderProjectDrafts();
  readSavedProjects();
  readOrgData();
  captureLedgerProjectsFromDom();
  initProgressView();
  renderSavedProjects();
  initProjectLedgerColumnResize();
  initTableColumnResize(document.getElementById("org-table"), orgColumnWidthKey, { minWidth: 72, maxWidth: 520, minTableWidth: 1480 });
  bindTwoDecimalInputs();
  activate(initial);
  applyProjectFilters();
  updateOrgSummary();
})();
