Option Explicit

Dim shell, fso, scriptDir, projectRoot, outLog, errorLog, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)
outLog = fso.BuildPath(projectRoot, "logs\sync-out.log")
errorLog = fso.BuildPath(projectRoot, "logs\sync-error.log")

command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File " & _
    Chr(34) & fso.BuildPath(scriptDir, "sync-tunnel-url.ps1") & Chr(34) & _
    " >> " & Chr(34) & outLog & Chr(34) & _
    " 2>> " & Chr(34) & errorLog & Chr(34)

WScript.Quit shell.Run(command, 0, True)
