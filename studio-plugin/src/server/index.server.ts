import State from "../modules/State";
import UI from "../modules/UI";
import Communication from "../modules/Communication";
import Settings from "../modules/Settings";


Settings.init(plugin);

const savedPorts = Settings.getSavedPorts();
if (savedPorts.size() > 0) {
	State.loadConnections(savedPorts);
}

UI.init(plugin);
const elements = UI.getElements();


const toolbar = plugin.CreateToolbar("MCP Integration");
const button = toolbar.CreateButton("MCP Server", "Connect to MCP Server for AI Integration", "rbxassetid://10734944444");


elements.connectButton.Activated.Connect(() => {
	const conn = State.getActiveConnection();
	if (conn && conn.isActive) {
		Communication.deactivatePlugin(State.getActiveTabIndex());
	} else {
		Communication.activatePlugin(State.getActiveTabIndex());
	}
});


button.Click.Connect(() => {
	elements.screenGui.Enabled = !elements.screenGui.Enabled;
});


plugin.Unloading.Connect(() => {
	Communication.deactivateAll();
});


UI.updateUIState();
Communication.checkForUpdates();
Communication.autoConnectOnStartup();
