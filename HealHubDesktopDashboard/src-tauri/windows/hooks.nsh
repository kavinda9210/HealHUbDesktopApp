!macro NSIS_HOOK_POSTINSTALL
  ; Automatically create the Desktop shortcut after installation.
  Call CreateOrUpdateDesktopShortcut
!macroend
