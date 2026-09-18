Option Explicit

Dim shell, fso, runnerCommand, command, exitCode

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim toolsDirectory, projectRoot
toolsDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(toolsDirectory)
runnerCommand = fso.BuildPath(projectRoot, "_github_runner\run.cmd")
If Not fso.FileExists(runnerCommand) Then
    runnerCommand = fso.BuildPath(shell.ExpandEnvironmentStrings("%USERPROFILE%"), "attendance-github-runner\run.cmd")
End If
command = "cmd.exe /d /c """ & runnerCommand & """"

exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
