version = "1.0.1"

-- Theme: Rose Pine
xplr.config.general.focus_ui.style.add_modifiers = { "Bold" }
xplr.config.general.selection_ui.style.add_modifiers = { "Bold" }

-- Key bindings
xplr.config.modes.builtin.default.key_bindings.on_key["v"] = {
  help = "preview",
  messages = {
    {
      BashExec = [===[
        cat "${XPLR_FOCUS_PATH:?}" 2>/dev/null | less -R
      ]===],
    },
  },
}

xplr.config.modes.builtin.default.key_bindings.on_key["e"] = {
  help = "edit",
  messages = {
    {
      BashExec = [===[
        ${EDITOR:-hx} "${XPLR_FOCUS_PATH:?}"
      ]===],
    },
  },
}

-- Show hidden files by default
xplr.config.general.show_hidden = true

-- Enable icons (requires nerd font)
xplr.config.general.enable_mouse = true

-- Sorting
xplr.config.general.initial_sorting = {
  { sorter = "ByCanonicalIsDir", reverse = true },
  { sorter = "ByIRelativePath", reverse = false },
}

-- Layout
xplr.config.general.panel_ui.default.borders = { "Top", "Right", "Bottom", "Left" }
xplr.config.general.panel_ui.default.border_type = "Rounded"

-- Performance
xplr.config.general.enable_recover_mode = true
