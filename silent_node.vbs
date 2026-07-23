Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\jadi\saas\inventory system"
WshShell.Run "node.exe server.js", 0, False
