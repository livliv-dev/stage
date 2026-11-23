; VTuber Stage keeps its settings, keys and projects in the folder it had as LivLiv Stage (%APPDATA%\LivLiv Stage,
; desktop/src/config.ts). The uninstaller's own --delete-app-data removes the folders named after the app as it is now;
; this removes that one too when the app data goes (never on an update).
!macro customUnInstall
  ${ifNot} ${isUpdated}
    StrCpy $R2 "0"
    ${GetParameters} $R0
    ClearErrors
    ${GetOptions} $R0 "--delete-app-data" $R1
    ${ifNot} ${Errors}
      StrCpy $R2 "1"
    ${endIf}
    !ifdef DELETE_APP_DATA_ON_UNINSTALL
      StrCpy $R2 "1"
    !endif
    ${if} $R2 == "1"
      ${if} $installMode == "all"
        SetShellVarContext current
      ${endif}
      RMDir /r "$APPDATA\LivLiv Stage"
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endif}
    ${endif}
  ${endif}
!macroend
