import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region index.js
var require_vite_plugin_logger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { readFileSync } = __require("fs");
	let nativeBinding = null;
	const loadErrors = [];
	const isMusl = () => {
		let musl = false;
		if (process.platform === "linux") {
			musl = isMuslFromFilesystem();
			if (musl === null) musl = isMuslFromReport();
			if (musl === null) musl = isMuslFromChildProcess();
		}
		return musl;
	};
	const isFileMusl = (f) => f.includes("libc.musl-") || f.includes("ld-musl-");
	const isMuslFromFilesystem = () => {
		try {
			return readFileSync("/usr/bin/ldd", "utf-8").includes("musl");
		} catch {
			return null;
		}
	};
	const isMuslFromReport = () => {
		let report = null;
		if (process.report && typeof process.report.getReport === "function") {
			process.report.excludeNetwork = true;
			report = process.report.getReport();
		}
		if (!report) return null;
		if (report.header && report.header.glibcVersionRuntime) return false;
		if (Array.isArray(report.sharedObjects)) {
			if (report.sharedObjects.some(isFileMusl)) return true;
		}
		return false;
	};
	const isMuslFromChildProcess = () => {
		try {
			return __require("child_process").execSync("ldd --version", { encoding: "utf8" }).includes("musl");
		} catch (e) {
			return false;
		}
	};
	function requireNative() {
		if (process.env.NAPI_RS_NATIVE_LIBRARY_PATH) try {
			return __require(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
		} catch (err) {
			loadErrors.push(err);
		}
		else if (process.platform === "android") {
			if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-logger.android-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-android-arm64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-android-arm64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm") {
				try {
					return __require("../vite-plugin-logger.android-arm-eabi.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-android-arm-eabi");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-android-arm-eabi/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Android ${process.arch}`));
		} else if (process.platform === "win32") {
			if (process.arch === "x64") {
				if (process.config && process.config.variables && process.config.variables.shlib_suffix === "dll.a" || process.config && process.config.variables && process.config.variables.node_target_type === "shared_library") {
					try {
						return __require("../vite-plugin-logger.win32-x64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-win32-x64-gnu");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-win32-x64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.win32-x64-msvc.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-win32-x64-msvc");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-win32-x64-msvc/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "ia32") {
				try {
					return __require("../vite-plugin-logger.win32-ia32-msvc.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-win32-ia32-msvc");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-win32-ia32-msvc/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-logger.win32-arm64-msvc.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-win32-arm64-msvc");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-win32-arm64-msvc/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Windows: ${process.arch}`));
		} else if (process.platform === "darwin") {
			try {
				return __require("../vite-plugin-logger.darwin-universal.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require("@kiyors/vite-plugin-logger-darwin-universal");
				const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-darwin-universal/package.json").version;
				if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
			if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-logger.darwin-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-darwin-x64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-darwin-x64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-logger.darwin-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-darwin-arm64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-darwin-arm64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on macOS: ${process.arch}`));
		} else if (process.platform === "freebsd") {
			if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-logger.freebsd-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-freebsd-x64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-freebsd-x64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-logger.freebsd-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-freebsd-arm64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-freebsd-arm64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on FreeBSD: ${process.arch}`));
		} else if (process.platform === "linux") {
			if (process.arch === "x64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-logger.linux-x64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-x64-musl");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-x64-musl/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.linux-x64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-x64-gnu");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-x64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "arm64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-logger.linux-arm64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-arm64-musl");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-arm64-musl/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.linux-arm64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-arm64-gnu");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-arm64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "arm") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-logger.linux-arm-musleabihf.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-arm-musleabihf");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-arm-musleabihf/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.linux-arm-gnueabihf.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-arm-gnueabihf");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-arm-gnueabihf/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "loong64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-logger.linux-loong64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-loong64-musl");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-loong64-musl/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.linux-loong64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-loong64-gnu");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-loong64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "riscv64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-logger.linux-riscv64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-riscv64-musl");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-riscv64-musl/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-logger.linux-riscv64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("@kiyors/vite-plugin-logger-linux-riscv64-gnu");
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-riscv64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "ppc64") {
				try {
					return __require("../vite-plugin-logger.linux-ppc64-gnu.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-linux-ppc64-gnu");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-ppc64-gnu/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "s390x") {
				try {
					return __require("../vite-plugin-logger.linux-s390x-gnu.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-linux-s390x-gnu");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-linux-s390x-gnu/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Linux: ${process.arch}`));
		} else if (process.platform === "openharmony") {
			if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-logger.openharmony-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-openharmony-arm64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-openharmony-arm64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-logger.openharmony-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-openharmony-x64");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-openharmony-x64/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm") {
				try {
					return __require("../vite-plugin-logger.openharmony-arm.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("@kiyors/vite-plugin-logger-openharmony-arm");
					const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-openharmony-arm/package.json").version;
					if (bindingPackageVersion !== "0.0.12" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on OpenHarmony: ${process.arch}`));
		} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported OS: ${process.platform}, architecture: ${process.arch}`));
	}
	function createLoadErrorChain(errors) {
		return errors.reduce((previous, current) => {
			let message;
			try {
				message = current && typeof current.message === "string" ? current.message : String(current);
			} catch {
				message = "Unknown error";
			}
			const error = new Error(message);
			error.cause = previous;
			return error;
		}, null);
	}
	const __napiWasiFlavors = ["wasm32-wasi"];
	const __napiWasiFlavor = process.env.NAPI_RS_WASI_FLAVOR;
	const __napiWasiFlavorRequested = typeof __napiWasiFlavor === "string" && __napiWasiFlavor.length > 0;
	if (__napiWasiFlavorRequested && __napiWasiFlavors.indexOf(__napiWasiFlavor) === -1) throw new Error("Unsupported WASI flavor \"" + __napiWasiFlavor + "\". Available flavors: " + __napiWasiFlavors.join(", "));
	const forceWasiError = process.env.NAPI_RS_FORCE_WASI === "error";
	const forceWasi = process.env.NAPI_RS_FORCE_WASI === "true" || forceWasiError || __napiWasiFlavorRequested;
	if (!forceWasi) nativeBinding = requireNative();
	if (!nativeBinding || forceWasi) {
		let wasiBinding = null;
		let wasiBindingLoaded = false;
		const wasiBindingErrors = [];
		const __napiWasiResolveCandidate = (specifier, isPackage, localArtifacts) => {
			try {
				__require.resolve(specifier);
			} catch (resolveError) {
				if (!resolveError || resolveError.code !== "MODULE_NOT_FOUND") throw resolveError;
				if (isPackage) {
					try {
						__require.resolve(specifier + "/package.json");
					} catch (packageError) {
						if (packageError && packageError.code === "MODULE_NOT_FOUND") return resolveError;
						throw resolveError;
					}
					throw resolveError;
				}
				return resolveError;
			}
			if (localArtifacts) {
				let artifactError = null;
				for (let i = 0; i < localArtifacts.length; i++) try {
					__require.resolve(localArtifacts[i]);
					return null;
				} catch (resolveError) {
					if (!resolveError || resolveError.code !== "MODULE_NOT_FOUND") throw resolveError;
					artifactError = resolveError;
				}
				return artifactError;
			}
			return null;
		};
		if (!wasiBindingLoaded && (!__napiWasiFlavorRequested || __napiWasiFlavor === "wasm32-wasi")) {
			let candidateError = null;
			let candidateFailed = false;
			try {
				candidateError = __napiWasiResolveCandidate("./vite-plugin-logger.wasi.cjs", false, ["./vite-plugin-logger.wasm32-wasi.debug.wasm", "./vite-plugin-logger.wasm32-wasi.wasm"]);
				candidateFailed = candidateError !== null;
				if (!candidateFailed) {
					wasiBinding = __require("./vite-plugin-logger.wasi.cjs");
					nativeBinding = wasiBinding;
					wasiBindingLoaded = true;
				}
			} catch (err) {
				candidateError = err;
				candidateFailed = true;
			}
			if (candidateFailed) {
				wasiBindingErrors.push(candidateError);
				loadErrors.push(candidateError);
			}
		}
		if (!wasiBindingLoaded && (!__napiWasiFlavorRequested || __napiWasiFlavor === "wasm32-wasi")) {
			let candidateError = null;
			let candidateFailed = false;
			try {
				candidateError = __napiWasiResolveCandidate("@kiyors/vite-plugin-logger-wasm32-wasi", true, void 0);
				candidateFailed = candidateError !== null;
				if (!candidateFailed) {
					if (process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") {
						const bindingPackageVersion = __require("@kiyors/vite-plugin-logger-wasm32-wasi/package.json").version;
						if (bindingPackageVersion !== "0.0.12") throw new Error(`WASI binding package version mismatch, expected 0.0.12 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					}
					wasiBinding = __require("@kiyors/vite-plugin-logger-wasm32-wasi");
					nativeBinding = wasiBinding;
					wasiBindingLoaded = true;
				}
			} catch (err) {
				candidateError = err;
				candidateFailed = true;
			}
			if (candidateFailed) {
				wasiBindingErrors.push(candidateError);
				loadErrors.push(candidateError);
			}
		}
		if (!wasiBindingLoaded && forceWasi && !forceWasiError && !__napiWasiFlavorRequested) nativeBinding = requireNative();
		if ((forceWasiError || __napiWasiFlavorRequested) && !wasiBindingLoaded) {
			const error = /* @__PURE__ */ new Error(__napiWasiFlavorRequested ? "WASI binding for flavor \"" + __napiWasiFlavor + "\" not found" : "WASI binding not found and NAPI_RS_FORCE_WASI is set to error");
			error.cause = createLoadErrorChain(wasiBindingErrors);
			throw error;
		}
	}
	if (!nativeBinding) {
		if (loadErrors.length > 0) {
			const error = /* @__PURE__ */ new Error("Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing both package-lock.json and node_modules directory.");
			error.cause = createLoadErrorChain(loadErrors);
			throw error;
		}
		throw new Error(`Failed to load native binding`);
	}
	module.exports = nativeBinding;
	module.exports.formatBrowserLog = nativeBinding.formatBrowserLog;
	module.exports.formatLogEntry = nativeBinding.formatLogEntry;
	module.exports.formatRouteLog = nativeBinding.formatRouteLog;
	module.exports.getBrowserLoggerScript = nativeBinding.getBrowserLoggerScript;
}));
//#endregion
//#region src/plugin.ts
var import_vite_plugin_logger = require_vite_plugin_logger();
const DEFAULT_EXCLUDE_URLS = [
	"?import",
	"vite_ping",
	"@fs",
	"/@vite/client"
];
function requestLogger(config) {
	return {
		name: "vite-plugin-request-logging-rust",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				if (config?.excludeReqType && config.excludeReqType.some((type) => type.toLowerCase() === method.toLowerCase())) return next();
				if ([...DEFAULT_EXCLUDE_URLS, ...config?.excludeUrls || []].some((match) => url.includes(match))) return next();
				const start = performance.now();
				let logged = false;
				const logIt = () => {
					if (logged) return;
					logged = true;
					res.removeListener("finish", logIt);
					res.removeListener("close", logIt);
					const durationMs = performance.now() - start;
					const status = res.statusCode;
					const cl = res.getHeader("content-length");
					const contentLength = cl ? Number(cl) : null;
					const location = res.getHeader("location");
					const redirectLocation = location ? String(location) : null;
					const routeName = config?.resolveRoute ? config.resolveRoute(url) : null;
					const logString = (0, import_vite_plugin_logger.formatLogEntry)(req.originalUrl || "", req.method || "GET", status, durationMs, contentLength, redirectLocation, routeName, null);
					if (logString) console.log(logString);
				};
				res.on("finish", logIt);
				res.on("close", logIt);
				next();
			});
		}
	};
}
function browserLogger() {
	const virtualModuleId = "virtual:browser-logger";
	const resolvedVirtualModuleId = "\0virtual:browser-logger";
	return {
		name: "vite-plugin-browser-logger",
		enforce: "pre",
		resolveId(id) {
			if (id === virtualModuleId) return resolvedVirtualModuleId;
		},
		load(id) {
			if (id === resolvedVirtualModuleId) return (0, import_vite_plugin_logger.getBrowserLoggerScript)();
		},
		transformIndexHtml() {
			return [{
				tag: "script",
				attrs: {
					type: "module",
					src: "/@id/__x00__virtual:browser-logger"
				},
				injectTo: "head-prepend"
			}];
		},
		configureServer(server) {
			const pendingBrowserLogs = /* @__PURE__ */ new Map();
			const flushBrowserLog = (key) => {
				const entry = pendingBrowserLogs.get(key);
				if (!entry) return;
				pendingBrowserLogs.delete(key);
				const logString = (0, import_vite_plugin_logger.formatBrowserLog)(entry.type, entry.message, entry.caller, entry.count > 1 ? entry.count : null);
				if (logString) console.log(logString);
			};
			server.httpServer?.on("close", () => {
				for (const [key, entry] of pendingBrowserLogs.entries()) {
					clearTimeout(entry.timer);
					flushBrowserLog(key);
				}
			});
			const handleBrowserLog = (data) => {
				const { type, message, caller } = data;
				const callerStr = caller ?? null;
				const key = `${type}:${message}:${callerStr ?? ""}`;
				const existing = pendingBrowserLogs.get(key);
				if (existing) {
					existing.count += 1;
					clearTimeout(existing.timer);
					existing.timer = setTimeout(() => flushBrowserLog(key), 80);
					return;
				}
				const entry = {
					count: 1,
					type,
					message,
					caller: callerStr,
					timer: setTimeout(() => flushBrowserLog(key), 80)
				};
				pendingBrowserLogs.set(key, entry);
			};
			const handleTanStackRoute = (data) => {
				const { routeId, path, params, durationMs, isPreload } = data;
				const logString = (0, import_vite_plugin_logger.formatRouteLog)(routeId || path, path, params ?? null, durationMs ? Number(durationMs) : null, Boolean(isPreload));
				if (logString) console.log(logString);
			};
			server.ws.on("vite-plugin-logger:browser-log", handleBrowserLog);
			server.ws.on("vite-plugin-logger:tanstack-route", handleTanStackRoute);
		}
	};
}
//#endregion
export { browserLogger, requestLogger, require_vite_plugin_logger as t };
