(function () {
    "use strict";

    var _cache = {};
    var _active_tab = "menu";
    var _search = "";

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

    function ensure_panel() {
        if ($("#infix-wql-panel").length) return;
        var html = [
            '<div id="infix-wql-panel">',
            '  <div class="wql-search-row">',
            '    <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style="opacity:.5;flex-shrink:0">',
            '      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>',
            '    </svg>',
            '    <input class="wql-search-input" type="text" placeholder="Search…" />',
            '  </div>',
            '  <div class="wql-tab-row">',
            '    <button class="wql-tab active" data-tab="menu">',
            '      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 4h11v1.5h-11V4zm0 3.5h11V9h-11V7.5zm0 3.5h7v1.5h-7V11z"/></svg>',
            '      Menu',
            '    </button>',
            '    <button class="wql-tab" data-tab="shortcuts">',
            '      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"/><path d="M8 4a.5.5 0 0 1 .5.5v3.793l2.146 2.147a.5.5 0 0 1-.707.707l-2.5-2.5A.5.5 0 0 1 7.5 8V4.5A.5.5 0 0 1 8 4z"/></svg>',
            '      Shortcuts',
            '    </button>',
            '  </div>',
            '  <div id="wql-body"></div>',
            '</div>',
        ].join("");
        $(".layout-main-section-wrapper").first().before(html);

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

    function render_body() {
        var ws = get_ws();
        var d = ws && _cache[ws];
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
            var html = "";
            if (!items.length) {
                html = '<p class="wql-empty">No shortcuts.</p>';
            } else {
                html = '<ul class="wql-links">';
                items.forEach(function (s) {
                    var color = s.color || "blue";
                    html += '<li><a href="' + link_href(s) + '" class="wql-link">' +
                        '<span class="indicator-pill ' + color + '" style="margin-right:6px;width:8px;height:8px;padding:0;border-radius:50%;display:inline-block"></span>' +
                        frappe.utils.escape_html(__(s.label || s.link_to || "")) + '</a></li>';
                });
                html += '</ul>';
            }
            $b.html(html);
        }
    }

    function update_panel() {
        var ws = get_ws();
        if (!ws) {
            $("#infix-wql-panel").hide();
            return;
        }

        ensure_panel();
        var $p = $("#infix-wql-panel");
        $p.show();

        if ($p.data("ws") !== ws) {
            _search = "";
            $p.find(".wql-search-input").val("");
            $p.data("ws", ws);
        }

        if (_cache[ws]) { render_body(); return; }

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

    function init() {
        $(document).on("page-change", function () { setTimeout(update_panel, 120); });

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
