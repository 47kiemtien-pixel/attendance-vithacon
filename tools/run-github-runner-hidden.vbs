Option Explicit

Dim shell, fso, runnerCommand, command, exitCode

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

runnerCommand = fso.BuildPath(shell.ExpandEnvironmentStrings("%USERPROFILE%"), "attendance-github-runner\run.cmd")
command = "cmd.exe /d /c """ & runnerCommand & """"

exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
