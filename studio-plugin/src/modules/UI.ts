import { TweenService } from "@rbxts/services";
import State from "./State";
import Settings from "./Settings";
import { Connection } from "../types";

interface UIElements {
	screenGui: DockWidgetPluginGui;
	mainFrame: Frame;
	contentFrame: ScrollingFrame;
	statusLabel: TextLabel;
	detailStatusLabel: TextLabel;
	statusIndicator: Frame;
	statusPulse: Frame;
	statusText: TextLabel;
	connectButton: TextButton;
	connectStroke: UIStroke;
	urlInput: TextBox;
	step1Dot: Frame;
	step1Label: TextLabel;
	step2Dot: Frame;
	step2Label: TextLabel;
	step3Dot: Frame;
	step3Label: TextLabel;
	troubleshootLabel: TextLabel;
	updateBanner: Frame;
	updateBannerText: TextLabel;
	tabBar: Frame;
	cogButton: TextButton;
	cogStroke: UIStroke;
	settingsPanel: Frame;
}

type UrlChangeHandler = (connIndex: number, serverUrl: string) => void;
let urlChangeHandler: UrlChangeHandler | undefined;
function setUrlChangeHandler(handler: UrlChangeHandler) {
	urlChangeHandler = handler;
}

let inSettingsView = false;

let elements: UIElements = undefined!;
let pulseAnimation: Tween | undefined;
let buttonHover = false;

interface TabButton {
	frame: Frame;
	label: TextLabel;
	dot: Frame;
	closeBtn: TextButton;
}
let tabButtons: Map<number, TabButton> = new Map();

const TWEEN_QUICK = new TweenInfo(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);

function tweenProp(instance: Instance, props: Record<string, unknown>) {
	TweenService.Create(instance, TWEEN_QUICK, props as unknown as { [key: string]: unknown }).Play();
}

const C = {
	bg: Color3.fromRGB(14, 14, 14),
	card: Color3.fromRGB(22, 22, 22),
	surface: Color3.fromRGB(30, 30, 30),
	border: Color3.fromRGB(38, 38, 38),
	subtle: Color3.fromRGB(48, 48, 48),
	muted: Color3.fromRGB(100, 100, 100),
	dim: Color3.fromRGB(140, 140, 140),
	label: Color3.fromRGB(180, 180, 180),
	white: Color3.fromRGB(240, 240, 240),
	green: Color3.fromRGB(52, 211, 153),
	yellow: Color3.fromRGB(251, 191, 36),
	red: Color3.fromRGB(248, 113, 113),
	gray: Color3.fromRGB(120, 120, 120),
};

const CORNER = new UDim(0, 4);

function getStatusDotColor(connIndex: number): Color3 {
	const conn = State.getConnection(connIndex);
	if (!conn || !conn.isActive) return C.red;
	if (conn.consecutiveFailures >= conn.maxFailuresBeforeError) return C.red;
	if (conn.lastHttpOk) return C.green;
	return C.yellow;
}

function setButtonConnect(btn: TextButton, stroke: UIStroke) {
	btn.Text = "Connect";
	btn.TextColor3 = C.white;
	btn.BackgroundColor3 = C.surface;
	stroke.Color = C.subtle;
}

function setButtonDisconnect(btn: TextButton, stroke: UIStroke) {
	btn.Text = "Disconnect";
	btn.TextColor3 = C.red;
	btn.BackgroundColor3 = C.bg;
	stroke.Color = Color3.fromRGB(80, 30, 30);
}

function stopPulseAnimation() {
	elements.statusPulse.Size = new UDim2(0, 10, 0, 10);
	elements.statusPulse.Position = new UDim2(0, 0, 0, 0);
	elements.statusPulse.BackgroundTransparency = 0.7;
}

function startPulseAnimation() {
	elements.statusPulse.Size = new UDim2(0, 10, 0, 10);
	elements.statusPulse.Position = new UDim2(0, 0, 0, 0);
	elements.statusPulse.BackgroundTransparency = 0.7;
}

let refreshTabBar: () => void;
let switchToTab: (index: number) => void;

function createTabButton(connIndex: number) {
	const conn = State.getConnection(connIndex);
	if (!conn) return;

	const isActive = connIndex === State.getActiveTabIndex();

	const tabFrame = new Instance("Frame");
	tabFrame.Size = new UDim2(0, 58, 1, -6);
	tabFrame.Position = new UDim2(0, 0, 0, 3);
	tabFrame.BackgroundColor3 = isActive ? C.surface : C.bg;
	tabFrame.BackgroundTransparency = isActive ? 0 : 0.5;
	tabFrame.BorderSizePixel = 0;
	tabFrame.LayoutOrder = connIndex;

	const tabCorner = new Instance("UICorner");
	tabCorner.CornerRadius = new UDim(0, 3);
	tabCorner.Parent = tabFrame;

	const dot = new Instance("Frame");
	dot.Size = new UDim2(0, 5, 0, 5);
	dot.Position = new UDim2(0, 6, 0.5, -2);
	dot.BackgroundColor3 = getStatusDotColor(connIndex);
	dot.BorderSizePixel = 0;
	dot.Parent = tabFrame;

	const dotCorner = new Instance("UICorner");
	dotCorner.CornerRadius = new UDim(1, 0);
	dotCorner.Parent = dot;

	const label = new Instance("TextLabel");
	label.Size = new UDim2(1, -26, 1, 0);
	label.Position = new UDim2(0, 14, 0, 0);
	label.BackgroundTransparency = 1;
	label.Text = tostring(conn.port);
	label.TextColor3 = isActive ? C.label : C.muted;
	label.TextSize = 10;
	label.Font = Enum.Font.GothamMedium;
	label.TextXAlignment = Enum.TextXAlignment.Left;
	label.TextTruncate = Enum.TextTruncate.AtEnd;
	label.Parent = tabFrame;

	const closeBtn = new Instance("TextButton");
	closeBtn.Size = new UDim2(0, 12, 0, 12);
	closeBtn.Position = new UDim2(1, -15, 0.5, -6);
	closeBtn.BackgroundTransparency = 1;
	closeBtn.Text = "x";
	closeBtn.TextColor3 = C.muted;
	closeBtn.TextSize = 8;
	closeBtn.Font = Enum.Font.GothamBold;
	closeBtn.Parent = tabFrame;

	const clickBtn = new Instance("TextButton");
	clickBtn.Size = new UDim2(1, -14, 1, 0);
	clickBtn.Position = new UDim2(0, 0, 0, 0);
	clickBtn.BackgroundTransparency = 1;
	clickBtn.Text = "";
	clickBtn.Parent = tabFrame;

	clickBtn.Activated.Connect(() => switchToTab(connIndex));
	closeBtn.Activated.Connect(() => {
		const c = State.getConnection(connIndex);
		if (c && c.isActive) return;
		if (State.getConnections().size() <= 1) return;
		State.removeConnection(connIndex);
		Settings.syncFromConnections(State.getConnections());
		refreshTabBar();
		switchToTab(State.getActiveTabIndex());
	});

	tabFrame.Parent = elements.tabBar;
	tabButtons.set(connIndex, { frame: tabFrame, label, dot, closeBtn });
}

refreshTabBar = () => {
	tabButtons.forEach((tb) => {
		if (tb.frame) tb.frame.Destroy();
	});
	tabButtons = new Map();
	for (let i = 0; i < State.getConnections().size(); i++) {
		createTabButton(i);
	}
	tabButtons.forEach((tb, i) => {
		const active = i === State.getActiveTabIndex();
		if (tb.frame) {
			tb.frame.BackgroundColor3 = active ? C.surface : C.bg;
			tb.frame.BackgroundTransparency = active ? 0 : 0.5;
		}
		if (tb.label) tb.label.TextColor3 = active ? C.label : C.muted;
	});
};

switchToTab = (index: number) => {
	if (index < 0 || index >= State.getConnections().size()) return;
	State.setActiveTabIndex(index);
	const conn = State.getActiveConnection();

	tabButtons.forEach((tb, i) => {
		const active = i === index;
		if (tb.frame) {
			tweenProp(tb.frame, { BackgroundColor3: active ? C.surface : C.bg, BackgroundTransparency: active ? 0 : 0.5 });
		}
		if (tb.label) tb.label.TextColor3 = active ? C.label : C.muted;
	});

	elements.urlInput.Text = conn.serverUrl;
	updateUIState();
};

function updateTabDot(connIndex: number) {
	const tb = tabButtons.get(connIndex);
	if (tb && tb.dot) {
		tb.dot.BackgroundColor3 = getStatusDotColor(connIndex);
	}
}

function updateTabLabel(connIndex: number) {
	const conn = State.getConnection(connIndex);
	const tb = tabButtons.get(connIndex);
	if (conn && tb && tb.label) {
		tb.label.Text = tostring(conn.port);
	}
}

function init(pluginRef: Plugin) {
	const CURRENT_VERSION = State.CURRENT_VERSION;

	const screenGui = pluginRef.CreateDockWidgetPluginGuiAsync(
		"MCPServerInterface",
		new DockWidgetPluginGuiInfo(Enum.InitialDockState.Float, false, false, 300, 260, 260, 200),
	);
	(screenGui as unknown as { Title: string }).Title = `MCP Server v${CURRENT_VERSION}`;

	const mainFrame = new Instance("Frame");
	mainFrame.Size = new UDim2(1, 0, 1, 0);
	mainFrame.BackgroundColor3 = C.bg;
	mainFrame.BorderSizePixel = 0;
	mainFrame.Parent = screenGui;

	const header = new Instance("Frame");
	header.Size = new UDim2(1, 0, 0, 40);
	header.BackgroundColor3 = C.bg;
	header.BorderSizePixel = 0;
	header.Parent = mainFrame;

	const headerLine = new Instance("Frame");
	headerLine.Size = new UDim2(1, -16, 0, 1);
	headerLine.Position = new UDim2(0, 8, 1, -1);
	headerLine.BackgroundColor3 = C.border;
	headerLine.BorderSizePixel = 0;
	headerLine.Parent = header;

	const titleLabel = new Instance("TextLabel");
	titleLabel.Size = new UDim2(1, -80, 0, 22);
	titleLabel.Position = new UDim2(0, 10, 0, 2);
	titleLabel.BackgroundTransparency = 1;
	titleLabel.RichText = true;
	titleLabel.Text = `<font color="#F0F0F0">MCP</font> <font color="#646464">v${CURRENT_VERSION}</font>`;
	titleLabel.TextColor3 = C.white;
	titleLabel.TextSize = 12;
	titleLabel.Font = Enum.Font.GothamBold;
	titleLabel.TextXAlignment = Enum.TextXAlignment.Left;
	titleLabel.Parent = header;

	const creditsLabel = new Instance("TextLabel");
	creditsLabel.Size = new UDim2(1, -20, 0, 12);
	creditsLabel.Position = new UDim2(0, 10, 0, 23);
	creditsLabel.BackgroundTransparency = 1;
	creditsLabel.RichText = true;
	creditsLabel.Text = '<font color="#999999">by</font> <font color="#CCCCCC">@BoshyDx</font> <font color="#666666">|</font> <font color="#999999">discord</font> <font color="#CCCCCC">boshyz</font>';
	creditsLabel.TextColor3 = C.muted;
	creditsLabel.TextSize = 8;
	creditsLabel.Font = Enum.Font.GothamMedium;
	creditsLabel.TextXAlignment = Enum.TextXAlignment.Left;
	creditsLabel.Parent = header;

	const statusContainer = new Instance("Frame");
	statusContainer.Size = new UDim2(0, 20, 0, 22);
	statusContainer.Position = new UDim2(1, -52, 0, 2);
	statusContainer.BackgroundTransparency = 1;
	statusContainer.Parent = header;

	const cogButton = new Instance("TextButton");
	cogButton.Size = new UDim2(0, 18, 0, 18);
	cogButton.Position = new UDim2(1, -24, 0, 4);
	cogButton.BackgroundColor3 = C.surface;
	cogButton.BackgroundTransparency = 0;
	cogButton.BorderSizePixel = 0;
	cogButton.AutoButtonColor = false;
	cogButton.Text = utf8.char(0x2699);
	cogButton.TextColor3 = C.white;
	cogButton.TextSize = 13;
	cogButton.Font = Enum.Font.SourceSansBold;
	cogButton.Parent = header;

	const cogCorner = new Instance("UICorner");
	cogCorner.CornerRadius = new UDim(0, 3);
	cogCorner.Parent = cogButton;

	const cogStroke = new Instance("UIStroke");
	cogStroke.Color = C.subtle;
	cogStroke.Thickness = 1;
	cogStroke.Parent = cogButton;

	cogButton.MouseEnter.Connect(() => {
		tweenProp(cogButton, {
			BackgroundColor3: C.subtle,
			TextColor3: C.white,
		});
		tweenProp(cogStroke, { Color: C.muted });
	});
	cogButton.MouseLeave.Connect(() => {
		tweenProp(cogButton, {
			BackgroundColor3: inSettingsView ? C.subtle : C.surface,
			TextColor3: C.white,
		});
		tweenProp(cogStroke, { Color: inSettingsView ? C.muted : C.subtle });
	});

	const statusIndicator = new Instance("Frame");
	statusIndicator.Size = new UDim2(0, 8, 0, 8);
	statusIndicator.Position = new UDim2(0.5, -4, 0.5, -4);
	statusIndicator.BackgroundColor3 = C.red;
	statusIndicator.BorderSizePixel = 0;
	statusIndicator.Parent = statusContainer;

	const statusCorner = new Instance("UICorner");
	statusCorner.CornerRadius = new UDim(1, 0);
	statusCorner.Parent = statusIndicator;

	const statusPulse = new Instance("Frame");
	statusPulse.Size = new UDim2(0, 10, 0, 10);
	statusPulse.Position = new UDim2(0, 0, 0, 0);
	statusPulse.BackgroundColor3 = C.red;
	statusPulse.BackgroundTransparency = 0.7;
	statusPulse.BorderSizePixel = 0;
	statusPulse.Parent = statusIndicator;

	const pulseCorner = new Instance("UICorner");
	pulseCorner.CornerRadius = new UDim(1, 0);
	pulseCorner.Parent = statusPulse;

	const statusText = new Instance("TextLabel");
	statusText.Size = new UDim2(0, 0, 0, 0);
	statusText.BackgroundTransparency = 1;
	statusText.Text = "OFFLINE";
	statusText.TextTransparency = 1;
	statusText.TextSize = 1;
	statusText.Font = Enum.Font.GothamMedium;
	statusText.TextColor3 = C.white;
	statusText.Parent = statusContainer;

	const tabBar = new Instance("Frame");
	tabBar.Size = new UDim2(1, 0, 0, 22);
	tabBar.Position = new UDim2(0, 0, 0, 40);
	tabBar.BackgroundColor3 = C.bg;
	tabBar.BorderSizePixel = 0;
	tabBar.Parent = mainFrame;

	const tabBarLayout = new Instance("UIListLayout");
	tabBarLayout.FillDirection = Enum.FillDirection.Horizontal;
	tabBarLayout.Padding = new UDim(0, 2);
	tabBarLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	tabBarLayout.VerticalAlignment = Enum.VerticalAlignment.Center;
	tabBarLayout.Parent = tabBar;

	const tabBarPadding = new Instance("UIPadding");
	tabBarPadding.PaddingLeft = new UDim(0, 8);
	tabBarPadding.PaddingRight = new UDim(0, 8);
	tabBarPadding.Parent = tabBar;

	const addTabBtn = new Instance("TextButton");
	addTabBtn.Size = new UDim2(0, 18, 0, 18);
	addTabBtn.BackgroundColor3 = C.surface;
	addTabBtn.BackgroundTransparency = 0.5;
	addTabBtn.BorderSizePixel = 0;
	addTabBtn.Text = "+";
	addTabBtn.TextColor3 = C.muted;
	addTabBtn.TextSize = 12;
	addTabBtn.Font = Enum.Font.GothamMedium;
	addTabBtn.LayoutOrder = 999;
	addTabBtn.Parent = tabBar;

	const addTabCorner = new Instance("UICorner");
	addTabCorner.CornerRadius = new UDim(0, 3);
	addTabCorner.Parent = addTabBtn;

	addTabBtn.MouseEnter.Connect(() => tweenProp(addTabBtn, { BackgroundTransparency: 0, BackgroundColor3: C.subtle }));
	addTabBtn.MouseLeave.Connect(() => tweenProp(addTabBtn, { BackgroundTransparency: 0.5, BackgroundColor3: C.surface }));
	addTabBtn.Activated.Connect(() => {
		const newIndex = State.addConnection();
		if (newIndex !== undefined) {
			Settings.syncFromConnections(State.getConnections());
			refreshTabBar();
			switchToTab(newIndex);
		}
	});

	const updateBanner = new Instance("Frame");
	updateBanner.Size = new UDim2(1, -16, 0, 24);
	updateBanner.Position = new UDim2(0, 8, 0, 64);
	updateBanner.BackgroundColor3 = Color3.fromRGB(40, 32, 10);
	updateBanner.BorderSizePixel = 0;
	updateBanner.Visible = false;
	updateBanner.Parent = mainFrame;

	const updateBannerCorner = new Instance("UICorner");
	updateBannerCorner.CornerRadius = new UDim(0, 3);
	updateBannerCorner.Parent = updateBanner;

	const updateBannerText = new Instance("TextLabel");
	updateBannerText.Size = new UDim2(1, -16, 1, 0);
	updateBannerText.Position = new UDim2(0, 8, 0, 0);
	updateBannerText.BackgroundTransparency = 1;
	updateBannerText.Text = "";
	updateBannerText.TextColor3 = C.yellow;
	updateBannerText.TextSize = 9;
	updateBannerText.Font = Enum.Font.GothamMedium;
	updateBannerText.TextXAlignment = Enum.TextXAlignment.Left;
	updateBannerText.Parent = updateBanner;

	const contentY = 66;
	const contentFrame = new Instance("ScrollingFrame");
	contentFrame.Size = new UDim2(1, -16, 1, -(contentY + 8));
	contentFrame.Position = new UDim2(0, 8, 0, contentY);
	contentFrame.BackgroundTransparency = 1;
	contentFrame.BorderSizePixel = 0;
	contentFrame.ScrollBarThickness = 2;
	contentFrame.ScrollBarImageColor3 = C.subtle;
	contentFrame.CanvasSize = new UDim2(0, 0, 0, 0);
	contentFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y;
	contentFrame.Parent = mainFrame;

	const card = new Instance("Frame");
	card.Size = new UDim2(1, 0, 0, 0);
	card.AutomaticSize = Enum.AutomaticSize.Y;
	card.BackgroundColor3 = C.card;
	card.BorderSizePixel = 0;
	card.LayoutOrder = 1;
	card.Parent = contentFrame;

	const cardCorner = new Instance("UICorner");
	cardCorner.CornerRadius = CORNER;
	cardCorner.Parent = card;

	const cardPadding = new Instance("UIPadding");
	cardPadding.PaddingLeft = new UDim(0, 10);
	cardPadding.PaddingRight = new UDim(0, 10);
	cardPadding.PaddingTop = new UDim(0, 8);
	cardPadding.PaddingBottom = new UDim(0, 10);
	cardPadding.Parent = card;

	const cardLayout = new Instance("UIListLayout");
	cardLayout.Padding = new UDim(0, 6);
	cardLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	cardLayout.Parent = card;

	const urlInput = new Instance("TextBox");
	urlInput.Size = new UDim2(1, 0, 0, 26);
	urlInput.BackgroundColor3 = C.bg;
	urlInput.BorderSizePixel = 0;
	urlInput.Text = "http://localhost:58741";
	urlInput.TextColor3 = C.label;
	urlInput.TextSize = 11;
	urlInput.Font = Enum.Font.GothamMedium;
	urlInput.ClearTextOnFocus = false;
	urlInput.PlaceholderText = "Server URL...";
	urlInput.PlaceholderColor3 = C.muted;
	urlInput.LayoutOrder = 1;
	urlInput.Parent = card;

	const urlCorner = new Instance("UICorner");
	urlCorner.CornerRadius = CORNER;
	urlCorner.Parent = urlInput;

	const urlPadding = new Instance("UIPadding");
	urlPadding.PaddingLeft = new UDim(0, 8);
	urlPadding.PaddingRight = new UDim(0, 8);
	urlPadding.Parent = urlInput;

	urlInput.FocusLost.Connect(() => {
		const conn = State.getActiveConnection();
		if (!conn || conn.isActive) return;
		conn.serverUrl = urlInput.Text;
		const [portStr] = conn.serverUrl.match(":(%d+)$");
		if (portStr) conn.port = tonumber(portStr) ?? conn.port;
		updateTabLabel(State.getActiveTabIndex());
		if (urlChangeHandler) urlChangeHandler(State.getActiveTabIndex(), conn.serverUrl);
	});

	const statusRow = new Instance("Frame");
	statusRow.Size = new UDim2(1, 0, 0, 14);
	statusRow.BackgroundTransparency = 1;
	statusRow.LayoutOrder = 2;
	statusRow.Parent = card;

	const statusLabel = new Instance("TextLabel");
	statusLabel.Size = new UDim2(1, 0, 1, 0);
	statusLabel.BackgroundTransparency = 1;
	statusLabel.Text = "Disconnected";
	statusLabel.TextColor3 = C.red;
	statusLabel.TextSize = 10;
	statusLabel.Font = Enum.Font.GothamBold;
	statusLabel.TextXAlignment = Enum.TextXAlignment.Left;
	statusLabel.TextWrapped = true;
	statusLabel.Parent = statusRow;

	const detailStatusLabel = new Instance("TextLabel");
	detailStatusLabel.Size = new UDim2(0.5, 0, 1, 0);
	detailStatusLabel.Position = new UDim2(0.5, 0, 0, 0);
	detailStatusLabel.BackgroundTransparency = 1;
	detailStatusLabel.Text = "HTTP: X  MCP: X";
	detailStatusLabel.TextColor3 = C.muted;
	detailStatusLabel.TextSize = 9;
	detailStatusLabel.Font = Enum.Font.GothamMedium;
	detailStatusLabel.TextXAlignment = Enum.TextXAlignment.Right;
	detailStatusLabel.TextWrapped = true;
	detailStatusLabel.Parent = statusRow;

	const stepsFrame = new Instance("Frame");
	stepsFrame.Size = new UDim2(1, 0, 0, 0);
	stepsFrame.AutomaticSize = Enum.AutomaticSize.Y;
	stepsFrame.BackgroundTransparency = 1;
	stepsFrame.LayoutOrder = 3;
	stepsFrame.Parent = card;

	const stepsLayout = new Instance("UIListLayout");
	stepsLayout.Padding = new UDim(0, 1);
	stepsLayout.FillDirection = Enum.FillDirection.Vertical;
	stepsLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	stepsLayout.Parent = stepsFrame;

	function createStepRow(text: string, order: number): [Frame, Frame, TextLabel] {
		const row = new Instance("Frame");
		row.Size = new UDim2(1, 0, 0, 13);
		row.BackgroundTransparency = 1;
		row.LayoutOrder = order;

		const d = new Instance("Frame");
		d.Size = new UDim2(0, 4, 0, 4);
		d.Position = new UDim2(0, 1, 0, 5);
		d.BackgroundColor3 = C.gray;
		d.BorderSizePixel = 0;
		d.Parent = row;

		const dCorner = new Instance("UICorner");
		dCorner.CornerRadius = new UDim(1, 0);
		dCorner.Parent = d;

		const lbl = new Instance("TextLabel");
		lbl.Size = new UDim2(1, -12, 1, 0);
		lbl.Position = new UDim2(0, 12, 0, 0);
		lbl.BackgroundTransparency = 1;
		lbl.Text = text;
		lbl.TextColor3 = C.dim;
		lbl.TextSize = 9;
		lbl.Font = Enum.Font.GothamMedium;
		lbl.TextXAlignment = Enum.TextXAlignment.Left;
		lbl.Parent = row;

		row.Parent = stepsFrame;
		return [row, d, lbl];
	}

	const [, step1Dot, step1Label] = createStepRow("HTTP server", 1);
	const [, step2Dot, step2Label] = createStepRow("MCP bridge", 2);
	const [, step3Dot, step3Label] = createStepRow("Commands", 3);

	const troubleshootLabel = new Instance("TextLabel");
	troubleshootLabel.Size = new UDim2(1, 0, 0, 24);
	troubleshootLabel.BackgroundTransparency = 1;
	troubleshootLabel.TextWrapped = true;
	troubleshootLabel.Visible = false;
	troubleshootLabel.Text = "MCP not responding. Close node.exe and restart server.";
	troubleshootLabel.TextColor3 = C.yellow;
	troubleshootLabel.TextSize = 9;
	troubleshootLabel.Font = Enum.Font.GothamMedium;
	troubleshootLabel.TextXAlignment = Enum.TextXAlignment.Left;
	troubleshootLabel.LayoutOrder = 4;
	troubleshootLabel.Parent = card;

	const connectButton = new Instance("TextButton");
	connectButton.Size = new UDim2(1, 0, 0, 28);
	connectButton.BackgroundColor3 = C.surface;
	connectButton.BackgroundTransparency = 0;
	connectButton.BorderSizePixel = 0;
	connectButton.Text = "Connect";
	connectButton.TextColor3 = C.white;
	connectButton.TextSize = 11;
	connectButton.Font = Enum.Font.GothamBold;
	connectButton.LayoutOrder = 5;
	connectButton.Parent = card;

	const connectCorner = new Instance("UICorner");
	connectCorner.CornerRadius = CORNER;
	connectCorner.Parent = connectButton;

	const connectStroke = new Instance("UIStroke");
	connectStroke.Color = C.subtle;
	connectStroke.Thickness = 1;
	connectStroke.Parent = connectButton;

	connectButton.MouseEnter.Connect(() => {
		buttonHover = true;
		const conn = State.getActiveConnection();
		if (conn && conn.isActive) {
			tweenProp(connectButton, { BackgroundColor3: C.surface });
			tweenProp(connectStroke, { Color: Color3.fromRGB(100, 35, 35) });
		} else {
			tweenProp(connectButton, { BackgroundColor3: C.subtle });
			tweenProp(connectStroke, { Color: C.muted });
		}
	});

	connectButton.MouseLeave.Connect(() => {
		buttonHover = false;
		const conn = State.getActiveConnection();
		if (conn && conn.isActive) {
			setButtonDisconnect(connectButton, connectStroke);
		} else {
			setButtonConnect(connectButton, connectStroke);
		}
	});

	const settingsPanel = buildSettingsPanel(mainFrame, contentFrame);

	cogButton.Activated.Connect(() => setSettingsView(!inSettingsView));

	elements = {
		screenGui, mainFrame, contentFrame, statusLabel, detailStatusLabel,
		statusIndicator, statusPulse, statusText, connectButton, connectStroke,
		urlInput, step1Dot, step1Label, step2Dot, step2Label, step3Dot, step3Label,
		troubleshootLabel, updateBanner, updateBannerText, tabBar,
		cogButton, cogStroke, settingsPanel,
	};

	refreshTabBar();
	const activeConn = State.getActiveConnection();
	if (activeConn) urlInput.Text = activeConn.serverUrl;
}

function buildSettingsPanel(mainFrame: Frame, contentFrame: ScrollingFrame): Frame {
	const panel = new Instance("Frame");
	panel.Size = contentFrame.Size;
	panel.Position = contentFrame.Position;
	panel.BackgroundTransparency = 1;
	panel.BorderSizePixel = 0;
	panel.Visible = false;
	panel.Parent = mainFrame;

	const card = new Instance("Frame");
	card.Size = new UDim2(1, 0, 0, 0);
	card.AutomaticSize = Enum.AutomaticSize.Y;
	card.BackgroundColor3 = C.card;
	card.BorderSizePixel = 0;
	card.Parent = panel;

	const cardCorner = new Instance("UICorner");
	cardCorner.CornerRadius = CORNER;
	cardCorner.Parent = card;

	const cardPadding = new Instance("UIPadding");
	cardPadding.PaddingLeft = new UDim(0, 10);
	cardPadding.PaddingRight = new UDim(0, 10);
	cardPadding.PaddingTop = new UDim(0, 8);
	cardPadding.PaddingBottom = new UDim(0, 10);
	cardPadding.Parent = card;

	const cardLayout = new Instance("UIListLayout");
	cardLayout.Padding = new UDim(0, 8);
	cardLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	cardLayout.Parent = card;

	const header = new Instance("TextLabel");
	header.Size = new UDim2(1, 0, 0, 16);
	header.BackgroundTransparency = 1;
	header.Text = "Settings";
	header.TextColor3 = C.white;
	header.TextSize = 11;
	header.Font = Enum.Font.GothamBold;
	header.TextXAlignment = Enum.TextXAlignment.Left;
	header.LayoutOrder = 1;
	header.Parent = card;

	addToggleRow(card, 2, "Auto-connect on load", "Reconnect active tabs when the plugin loads", Settings.getAutoConnect(), (on) => {
		Settings.setAutoConnect(on);
	});

	return panel;
}

function addToggleRow(
	parent: Instance,
	order: number,
	title: string,
	subtitle: string,
	initial: boolean,
	onChange: (on: boolean) => void,
) {
	const row = new Instance("Frame");
	row.Size = new UDim2(1, 0, 0, 30);
	row.BackgroundTransparency = 1;
	row.LayoutOrder = order;
	row.Parent = parent;

	const titleLbl = new Instance("TextLabel");
	titleLbl.Size = new UDim2(1, -40, 0, 14);
	titleLbl.Position = new UDim2(0, 0, 0, 0);
	titleLbl.BackgroundTransparency = 1;
	titleLbl.Text = title;
	titleLbl.TextColor3 = C.label;
	titleLbl.TextSize = 10;
	titleLbl.Font = Enum.Font.GothamMedium;
	titleLbl.TextXAlignment = Enum.TextXAlignment.Left;
	titleLbl.Parent = row;

	const subLbl = new Instance("TextLabel");
	subLbl.Size = new UDim2(1, -40, 0, 12);
	subLbl.Position = new UDim2(0, 0, 0, 14);
	subLbl.BackgroundTransparency = 1;
	subLbl.Text = subtitle;
	subLbl.TextColor3 = C.muted;
	subLbl.TextSize = 9;
	subLbl.Font = Enum.Font.GothamMedium;
	subLbl.TextXAlignment = Enum.TextXAlignment.Left;
	subLbl.Parent = row;

	const toggle = new Instance("TextButton");
	toggle.AnchorPoint = new Vector2(1, 0.5);
	toggle.Position = new UDim2(1, 0, 0.5, 0);
	toggle.Size = new UDim2(0, 28, 0, 14);
	toggle.BackgroundColor3 = initial ? C.green : C.subtle;
	toggle.AutoButtonColor = false;
	toggle.BorderSizePixel = 0;
	toggle.Text = "";
	toggle.Parent = row;

	const toggleCorner = new Instance("UICorner");
	toggleCorner.CornerRadius = new UDim(1, 0);
	toggleCorner.Parent = toggle;

	const knob = new Instance("Frame");
	knob.Size = new UDim2(0, 10, 0, 10);
	knob.Position = initial ? new UDim2(1, -12, 0.5, -5) : new UDim2(0, 2, 0.5, -5);
	knob.BackgroundColor3 = C.white;
	knob.BorderSizePixel = 0;
	knob.Parent = toggle;

	const knobCorner = new Instance("UICorner");
	knobCorner.CornerRadius = new UDim(1, 0);
	knobCorner.Parent = knob;

	let state = initial;
	toggle.Activated.Connect(() => {
		state = !state;
		tweenProp(toggle, { BackgroundColor3: state ? C.green : C.subtle });
		tweenProp(knob, { Position: state ? new UDim2(1, -12, 0.5, -5) : new UDim2(0, 2, 0.5, -5) });
		onChange(state);
	});
}

function setSettingsView(show: boolean) {
	if (!elements) return;
	inSettingsView = show;
	elements.contentFrame.Visible = !show;
	elements.settingsPanel.Visible = show;
	tweenProp(elements.cogButton, {
		BackgroundTransparency: 0,
		BackgroundColor3: show ? C.subtle : C.surface,
		TextColor3: C.white,
	});
	tweenProp(elements.cogStroke, {
		Color: show ? C.muted : C.subtle,
	});
}

function layoutContentArea(withBanner: boolean) {
	if (!elements) return;
	const position = withBanner ? new UDim2(0, 8, 0, 92) : new UDim2(0, 8, 0, 66);
	const size = withBanner ? new UDim2(1, -16, 1, -100) : new UDim2(1, -16, 1, -74);
	elements.contentFrame.Position = position;
	elements.contentFrame.Size = size;
	elements.settingsPanel.Position = position;
	elements.settingsPanel.Size = size;
}

function updateUIState() {
	const conn = State.getActiveConnection();
	if (!conn) return;
	const el = elements;

	if (!conn.isActive) {
		el.statusLabel.Text = "Disconnected";
		el.statusLabel.TextColor3 = C.muted;
		el.statusIndicator.BackgroundColor3 = C.red;
		el.statusPulse.BackgroundColor3 = C.red;
		el.statusText.Text = "OFFLINE";
		el.detailStatusLabel.Text = "";
		el.detailStatusLabel.TextColor3 = C.muted;
		stopPulseAnimation();

		el.step1Dot.BackgroundColor3 = C.gray;
		el.step1Label.Text = "HTTP server";
		el.step2Dot.BackgroundColor3 = C.gray;
		el.step2Label.Text = "MCP bridge";
		el.step3Dot.BackgroundColor3 = C.gray;
		el.step3Label.Text = "Commands";
		el.troubleshootLabel.Visible = false;

		if (!buttonHover) setButtonConnect(el.connectButton, el.connectStroke);
		el.urlInput.TextEditable = true;
		el.urlInput.BackgroundColor3 = C.bg;
		return;
	}

	if (!buttonHover) setButtonDisconnect(el.connectButton, el.connectStroke);
	el.urlInput.TextEditable = false;
	el.urlInput.BackgroundColor3 = C.card;

	if (conn.lastHttpOk && conn.lastMcpOk) {
		el.statusLabel.Text = "Connected";
		el.statusLabel.TextColor3 = Color3.fromRGB(34, 197, 94);
		el.statusIndicator.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.statusPulse.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.statusText.Text = "ONLINE";
		el.detailStatusLabel.Text = "HTTP: OK  MCP: OK";
		el.detailStatusLabel.TextColor3 = Color3.fromRGB(34, 197, 94);
		el.step1Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.step1Label.Text = "HTTP server (OK)";
		el.step2Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.step2Label.Text = "MCP bridge (OK)";
		el.step3Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.step3Label.Text = "Commands (OK)";
		el.troubleshootLabel.Visible = false;
		stopPulseAnimation();
	} else if (conn.lastHttpOk && !conn.lastMcpOk) {
		el.statusLabel.Text = "Waiting for MCP server";
		el.statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
		el.statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.statusText.Text = "WAITING";
		el.detailStatusLabel.Text = "HTTP: OK  MCP: ...";
		el.detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
		el.step1Dot.BackgroundColor3 = Color3.fromRGB(34, 197, 94);
		el.step1Label.Text = "HTTP server (OK)";
		el.step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.step2Label.Text = "MCP bridge (waiting...)";
		el.step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.step3Label.Text = "Commands (waiting...)";
		const elapsed = conn.mcpWaitStartTime !== undefined ? tick() - conn.mcpWaitStartTime : 0;
		el.troubleshootLabel.Visible = elapsed > 8;
		startPulseAnimation();
	} else if (conn.consecutiveFailures >= conn.maxFailuresBeforeError) {
		el.statusLabel.Text = "Server unavailable";
		el.statusLabel.TextColor3 = Color3.fromRGB(239, 68, 68);
		el.statusIndicator.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
		el.statusPulse.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
		el.statusText.Text = "ERROR";
		el.detailStatusLabel.Text = "HTTP: X  MCP: X";
		el.detailStatusLabel.TextColor3 = Color3.fromRGB(239, 68, 68);
		el.step1Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
		el.step1Label.Text = "HTTP server (error)";
		el.step2Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
		el.step2Label.Text = "MCP bridge (error)";
		el.step3Dot.BackgroundColor3 = Color3.fromRGB(239, 68, 68);
		el.step3Label.Text = "Commands (error)";
		el.troubleshootLabel.Visible = false;
		stopPulseAnimation();
	} else if (conn.consecutiveFailures > 5) {
		const waitTime = math.ceil(conn.currentRetryDelay);
		el.statusLabel.Text = `Retrying (${waitTime}s)`;
		el.statusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
		el.statusIndicator.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.statusPulse.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.statusText.Text = "RETRY";
		el.detailStatusLabel.Text = "HTTP: ...  MCP: ...";
		el.detailStatusLabel.TextColor3 = Color3.fromRGB(245, 158, 11);
		el.step1Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.step1Label.Text = "HTTP server (retrying...)";
		el.step2Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.step2Label.Text = "MCP bridge (retrying...)";
		el.step3Dot.BackgroundColor3 = Color3.fromRGB(245, 158, 11);
		el.step3Label.Text = "Commands (retrying...)";
		el.troubleshootLabel.Visible = false;
		startPulseAnimation();
	} else {
		el.statusLabel.Text = conn.consecutiveFailures > 1
			? `Connecting (attempt ${conn.consecutiveFailures})`
			: "Connecting...";
		el.statusLabel.TextColor3 = C.yellow;
		el.statusIndicator.BackgroundColor3 = C.yellow;
		el.statusPulse.BackgroundColor3 = C.yellow;
		el.statusText.Text = "CONNECTING";
		el.detailStatusLabel.Text = conn.consecutiveFailures === 0 ? "..." : "HTTP: ...  MCP: ...";
		el.detailStatusLabel.TextColor3 = C.muted;
		el.step1Dot.BackgroundColor3 = C.yellow;
		el.step1Label.Text = "HTTP server (connecting...)";
		el.step2Dot.BackgroundColor3 = C.yellow;
		el.step2Label.Text = "MCP bridge (connecting...)";
		el.step3Dot.BackgroundColor3 = C.yellow;
		el.step3Label.Text = "Commands (connecting...)";
		el.troubleshootLabel.Visible = false;
		startPulseAnimation();
	}
}

export = {
	elements: undefined as unknown as UIElements,
	init,
	updateUIState,
	updateTabDot,
	updateTabLabel,
	stopPulseAnimation,
	startPulseAnimation,
	getElements: () => elements,
	setUrlChangeHandler,
	setSettingsView,
	layoutContentArea,
};
