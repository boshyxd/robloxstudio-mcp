import Utils from "../Utils";
import Recording from "../Recording";

const { getInstanceByPath, convertPropertyValue, evaluateFormula } = Utils;
const { beginRecording, finishRecording } = Recording;

function setProperty(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue;

	if (!instancePath || !propertyName) {
		return { error: "Instance path and property name are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };
	const recordingId = beginRecording(`Set ${propertyName} property`);

	const inst = instance as unknown as Record<string, unknown>;

	const [success, result] = pcall(() => {
		if (propertyName === "Parent" || propertyName === "PrimaryPart") {
			if (typeIs(propertyValue, "string")) {
				const refInstance = getInstanceByPath(propertyValue);
				if (refInstance) {
					inst[propertyName] = refInstance;
				} else {
					return { error: `${propertyName} instance not found: ${propertyValue}` };
				}
			}
		} else if (propertyName === "Name") {
			instance.Name = tostring(propertyValue);
		} else if (propertyName === "Source" && instance.IsA("LuaSourceContainer")) {
			(instance as unknown as { Source: string }).Source = tostring(propertyValue);
		} else {
			const convertedValue = convertPropertyValue(instance, propertyName, propertyValue);
			if (convertedValue !== undefined) {
				inst[propertyName] = convertedValue;
			} else {
				inst[propertyName] = propertyValue;
			}
		}

		return true;
	});

	if (success) {
		finishRecording(recordingId, true);
		return {
			success: true,
			instancePath,
			propertyName,
			propertyValue,
			message: "Property set successfully",
		};
	} else {
		finishRecording(recordingId, false);
		return { error: `Failed to set property: ${result}`, instancePath, propertyName };
	}
}

function massSetProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;
	const propertyValue = requestData.propertyValue;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName) {
		return { error: "Paths array and property name are required" };
	}

	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;
	const recordingId = beginRecording(`Mass set ${propertyName} property`);

	for (const path of paths) {
		const instance = getInstanceByPath(path);
		if (instance) {
			const [success, err] = pcall(() => {
				(instance as unknown as Record<string, unknown>)[propertyName] = propertyValue;
			});
			if (success) {
				successCount++;
				results.push({ path, success: true, propertyName, propertyValue });
			} else {
				failureCount++;
				results.push({ path, success: false, error: tostring(err) });
			}
		} else {
			failureCount++;
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		results,
		summary: { total: paths.size(), succeeded: successCount, failed: failureCount },
	};
}

function massGetProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName) {
		return { error: "Paths array and property name are required" };
	}

	const results: Record<string, unknown>[] = [];

	for (const path of paths) {
		const instance = getInstanceByPath(path);
		if (instance) {
			const [success, value] = pcall(() => (instance as unknown as Record<string, unknown>)[propertyName]);
			if (success) {
				results.push({ path, success: true, propertyName, propertyValue: value });
			} else {
				results.push({ path, success: false, error: tostring(value) });
			}
		} else {
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	return { results, propertyName };
}

function setCalculatedProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;
	const formula = requestData.formula as string;
	const variables = requestData.variables as Record<string, unknown> | undefined;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName || !formula) {
		return { error: "Paths, property name, and formula are required" };
	}

	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;
	const recordingId = beginRecording(`Set calculated ${propertyName} property`);

	for (let i = 0; i < paths.size(); i++) {
		const path = paths[i];
		const instance = getInstanceByPath(path);
		if (instance) {
			const [value, evalError] = evaluateFormula(formula, variables, instance, i + 1);

			if (value !== undefined && !evalError) {
				const [success, err] = pcall(() => {
					(instance as unknown as Record<string, unknown>)[propertyName] = value;
				});
				if (success) {
					successCount++;
					results.push({ path, success: true, propertyName, calculatedValue: value, formula });
				} else {
					failureCount++;
					results.push({ path, success: false, error: `Property set failed: ${err}` });
				}
			} else {
				failureCount++;
				results.push({ path, success: false, error: evalError ?? "Formula evaluation failed" });
			}
		} else {
			failureCount++;
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		results,
		summary: { total: paths.size(), succeeded: successCount, failed: failureCount },
		formula,
	};
}

function setRelativeProperty(requestData: Record<string, unknown>) {
	const paths = requestData.paths as string[];
	const propertyName = requestData.propertyName as string;
	const operation = requestData.operation as string;
	const value = requestData.value as number;
	const component = requestData.component as string | undefined;

	if (!paths || !typeIs(paths, "table") || (paths as defined[]).size() === 0 || !propertyName || !operation || value === undefined) {
		return { error: "Paths, property name, operation, and value are required" };
	}

	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;
	const recordingId = beginRecording(`Set relative ${propertyName} property`);

	function applyOp(current: number, op: string, val: number): number {
		if (op === "add") return current + val;
		if (op === "subtract") return current - val;
		if (op === "multiply") return current * val;
		if (op === "divide") return current / val;
		if (op === "power") return current ** val;
		return current;
	}

	for (const path of paths) {
		const instance = getInstanceByPath(path);
		if (instance) {
			const [success, err] = pcall(() => {
				const currentValue = (instance as unknown as Record<string, unknown>)[propertyName];
				let newValue: unknown;

				if (component && typeOf(currentValue) === "Vector3") {
					const cv = currentValue as Vector3;
					let x = cv.X, y = cv.Y, z = cv.Z;
					if (component === "X") x = applyOp(x, operation, value);
					else if (component === "Y") y = applyOp(y, operation, value);
					else if (component === "Z") z = applyOp(z, operation, value);
					newValue = new Vector3(x, y, z);
				} else if (typeOf(currentValue) === "Color3" && typeOf(value) === "Color3") {
					const cv = currentValue as Color3;
					const v = value as unknown as Color3;
					if (operation === "add") {
						newValue = new Color3(math.min(1, cv.R + v.R), math.min(1, cv.G + v.G), math.min(1, cv.B + v.B));
					} else if (operation === "subtract") {
						newValue = new Color3(math.max(0, cv.R - v.R), math.max(0, cv.G - v.G), math.max(0, cv.B - v.B));
					} else if (operation === "multiply") {
						newValue = new Color3(cv.R * v.R, cv.G * v.G, cv.B * v.B);
					}
				} else if (typeIs(currentValue, "number") && typeIs(value, "number")) {
					newValue = applyOp(currentValue, operation, value);
				} else if (typeOf(currentValue) === "Vector3" && typeIs(value, "number")) {
					const cv = currentValue as Vector3;
					newValue = new Vector3(applyOp(cv.X, operation, value), applyOp(cv.Y, operation, value), applyOp(cv.Z, operation, value));
				} else if (typeOf(currentValue) === "UDim2" && typeIs(value, "number") && component) {
					const cv = currentValue as UDim2;
					let xs = cv.X.Scale, xo = cv.X.Offset, ys = cv.Y.Scale, yo = cv.Y.Offset;
					if (component === "XScale") xs = applyOp(xs, operation, value);
					else if (component === "XOffset") xo = applyOp(xo, operation, value);
					else if (component === "YScale") ys = applyOp(ys, operation, value);
					else if (component === "YOffset") yo = applyOp(yo, operation, value);
					newValue = new UDim2(xs, xo, ys, yo);
				} else {
					error("Unsupported property type or operation");
				}

				(instance as unknown as Record<string, unknown>)[propertyName] = newValue;
				return newValue;
			});

			if (success) {
				successCount++;
				results.push({ path, success: true, propertyName, operation, value, component, newValue: err });
			} else {
				failureCount++;
				results.push({ path, success: false, error: tostring(err) });
			}
		} else {
			failureCount++;
			results.push({ path, success: false, error: "Instance not found" });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		results,
		summary: { total: paths.size(), succeeded: successCount, failed: failureCount },
		operation,
		value,
	};
}

// Set multiple properties on a single instance in one call
function setProperties(requestData: Record<string, unknown>) {
	const instancePath = requestData.instancePath as string;
	const properties = requestData.properties as Record<string, unknown>;

	if (!instancePath || !properties || !typeIs(properties, "table")) {
		return { error: "Instance path and properties object are required" };
	}

	const instance = getInstanceByPath(instancePath);
	if (!instance) return { error: `Instance not found: ${instancePath}` };

	const recordingId = beginRecording("Set multiple properties");
	const inst = instance as unknown as Record<string, unknown>;
	const results: Record<string, unknown>[] = [];
	let successCount = 0;
	let failureCount = 0;

	for (const [propName, propValue] of pairs(properties as Record<string, unknown>)) {
		const [success, err] = pcall(() => {
			if (propName === "Parent" || propName === "PrimaryPart") {
				if (typeIs(propValue, "string")) {
					const refInstance = getInstanceByPath(propValue as string);
					if (refInstance) inst[propName] = refInstance;
				}
			} else if (propName === "Name") {
				instance.Name = tostring(propValue);
			} else {
				const convertedValue = convertPropertyValue(instance, propName as string, propValue);
				if (convertedValue !== undefined) {
					inst[propName] = convertedValue;
				} else {
					inst[propName] = propValue;
				}
			}
		});

		if (success) {
			successCount++;
			results.push({ property: propName, success: true });
		} else {
			failureCount++;
			results.push({ property: propName, success: false, error: tostring(err) });
		}
	}

	finishRecording(recordingId, successCount > 0);

	return {
		success: successCount > 0,
		instancePath,
		summary: { total: successCount + failureCount, succeeded: successCount, failed: failureCount },
		results,
	};
}

export = {
	setProperty,
	setProperties,
	massSetProperty,
	massGetProperty,
	setCalculatedProperty,
	setRelativeProperty,
};
