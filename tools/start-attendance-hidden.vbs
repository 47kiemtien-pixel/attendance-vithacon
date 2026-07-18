Option Explicit

Dim shell, fso, scriptDirectory, commandPath, exitCode

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
commandPath = fso.BuildPath(scriptDirectory, "start-attendance-hidden.cmd")

exitCode = shell.Run("""" & commandPath & """", 0, True)
WScript.Quit exitCode
