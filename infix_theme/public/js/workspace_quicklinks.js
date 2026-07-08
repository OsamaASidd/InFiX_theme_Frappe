(function () {
    "use strict";

    // Panel HTML lives in main.html (server-rendered), exactly like DataValue's
    // #side-menu-component. This JS only handles content loading + tab/search events.

    var _cache      = {};
    var _active_tab = "menu";
    var _search     = "";
    var _last_ws    = null;

    function get_ws() {
        var r = frappe.get_route && frappe.get_route();
        return (r && r[0] === "Workspaces" && r[1]) ? r[1] : null;
    }

    function link_href(item) {
        var t = (item.link_type || item.type || "").toLowerCase();
        if (t === "doctype") return "/app/" + frappe.router.slug(item.link_to);
        if (t === "page")    return "/app/" + frappe.router.slug(item.link_to);
        if (t === "report")  return "/app/query-report/" + encodeURIComponent(item.link_to);
        return "#";
    }

    function render_body() {
        var d  = _last_ws && _cache[_last_ws];
        var $b = $("#wql-body");
        if (!$b.length || !d) return;

        if (_active_tab === "menu") {
            var html = "";
            (d.cards || []).forEach(function (g) {
                var links = (g.links || []).filter(function (l) {
                    return !_search || (l.label || "").toLowerCase().includes(_search);
                });
                if (!links.length) return;
                html += '<div class="wql-group">';
                html += '<button class="wql-group-hdr"><span>' + frappe.utils.escape_html(__(g.label || "")) + '</span>';
                html += '<svg class="wql-chev" width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 5.5L8 12l6.5-6.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>';
                html += '<ul class="wql-links">';
                links.forEach(function (l) {
                    html += '<li><a href="' + link_href(l) + '" class="wql-link">' + frappe.utils.escape_html(__(l.label || l.link_to || "")) + '</a></li>';
                });
                html += '</ul></div>';
            });
            $b.html(html || '<p class="wql-empty">No links found.</p>');
            $b.find(".wql-group-hdr").off("click").on("click", function () {
                $(this).closest(".wql-group").toggleClass("wql-collapsed");
            });
        } else {
            var items = (d.shortcuts || []).filter(function (s) {
                return !_search || (s.label || "").toLowerCase().includes(_search);
            });
            var shtml = items.length ? '<ul class="wql-links">' : '<p class="wql-empty">No shortcuts.</p>';
            items.forEach(function (s) {
                shtml += '<li><a href="' + link_href(s) + '" class="wql-link">' +
                    '<span class="indicator-pill ' + (s.color || "blue") + '" style="margin-right:6px;width:8px;height:8px;padding:0;border-radius:50%;display:inline-block"></span>' +
                    frappe.utils.escape_html(__(s.label || s.link_to || "")) + '</a></li>';
            });
            if (items.length) shtml += '</ul>';
            $b.html(shtml);
        }
    }

    function load_ws(ws) {
        _last_ws = ws;
        try { localStorage.setItem("wql_last_ws", ws); } catch(e) {}
        $("body").addClass("wql-panel-active");

        var $p = $("#infix-wql-panel");
        if ($p.data("ws") !== ws) {
            _search = "";
            $p.find(".wql-search-input").val("");
            $p.data("ws", ws);
        }

        if (_cache[ws]) {
            render_body();
            return;
        }

        $("#wql-body").html('<p class="wql-empty">Loading…</p>');
        frappe.call({
            method: "frappe.desk.desktop.get_desktop_page",
            args: { page: JSON.stringify({ name: ws, title: ws }) },
            callback: function (r) {
                if (!r || !r.message) return;
                _cache[ws] = {
                    cards:     (r.message.cards     && r.message.cards.items)     || [],
                    shortcuts: (r.message.shortcuts && r.message.shortcuts.items) || [],
                };
                render_body();
            },
        });
    }

    function update_panel() {
        var ws = get_ws();
        if (ws) {
            load_ws(ws);
        } else if (!_last_ws) {
            // Restore from localStorage on non-workspace pages (e.g. hard refresh)
            var saved;
            try { saved = localStorage.getItem("wql_last_ws"); } catch(e) {}
            if (saved) load_ws(saved);
        }
    }

    function wire_events() {
        $(document).on("click", "#infix-wql-panel .wql-tab", function () {
            _active_tab = $(this).data("tab");
            $("#infix-wql-panel .wql-tab").removeClass("active");
            $(this).addClass("active");
            render_body();
        });
        $(document).on("input", "#infix-wql-panel .wql-search-input", function () {
            _search = $(this).val().toLowerCase().trim();
            render_body();
        });
    }

    function init() {
        wire_events();
        $(document).on("page-change", function () { setTimeout(update_panel, 150); });

        var orig = frappe.views && frappe.views.Workspace && frappe.views.Workspace.prototype.show;
        if (orig) {
            frappe.views.Workspace.prototype.show = function () {
                var ret = orig.apply(this, arguments);
                setTimeout(update_panel, 200);
                return ret;
            };
        }

        setTimeout(update_panel, 600);
    }

    $(document).ready(function () {
        var t = 0;
        var iv = setInterval(function () {
            if ((typeof frappe !== "undefined" && frappe.call) || ++t > 30) {
                clearInterval(iv);
                init();
            }
        }, 200);
    });
})();
