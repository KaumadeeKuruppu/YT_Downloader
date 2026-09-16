Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")

' Run backend and frontend completely hidden (0 means hidden window)
WshShell.Run "cmd /c cd /d """ & currentDir & "\backend"" && node server.js", 0, False
WshShell.Run "cmd /c cd /d """ & currentDir & "\frontend"" && npm run dev", 0, False

' Wait 4 seconds for servers to start
WScript.Sleep 4000

' Open the browser directly
WshShell.Run "http://localhost:5173"
