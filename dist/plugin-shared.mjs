import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region index.js
var require_vite_plugin_logger = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { readFileSync } = __require("fs");
	let nativeBinding = null;
	let __napiLoadedBindingTarget = "native";
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
			const overrideBinding = __require(process.env.NAPI_RS_NATIVE_LIBRARY_PATH);
			__napiLoadedBindingTarget = overrideBinding && typeof overrideBinding.__napiBindingTarget === "string" ? overrideBinding.__napiBindingTarget : "native";
			return overrideBinding;
		} catch (err) {
			loadErrors.push(err);
		}
		else if (process.platform === "android") {
			if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-hyperlog.android-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-android-arm64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-android-arm64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm") {
				try {
					return __require("../vite-plugin-hyperlog.android-arm-eabi.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-android-arm-eabi");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-android-arm-eabi/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Android ${process.arch}`));
		} else if (process.platform === "win32") {
			if (process.arch === "x64") {
				if (process.config && process.config.variables && process.config.variables.shlib_suffix === "dll.a" || process.config && process.config.variables && process.config.variables.node_target_type === "shared_library") {
					try {
						return __require("../vite-plugin-hyperlog.win32-x64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-win32-x64-gnu");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-win32-x64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.win32-x64-msvc.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-win32-x64-msvc");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-win32-x64-msvc/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "ia32") {
				try {
					return __require("../vite-plugin-hyperlog.win32-ia32-msvc.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-win32-ia32-msvc");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-win32-ia32-msvc/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-hyperlog.win32-arm64-msvc.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-win32-arm64-msvc");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-win32-arm64-msvc/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Windows: ${process.arch}`));
		} else if (process.platform === "darwin") {
			try {
				return __require("../vite-plugin-hyperlog.darwin-universal.node");
			} catch (e) {
				loadErrors.push(e);
			}
			try {
				const binding = __require("vite-plugin-hyperlog-darwin-universal");
				const bindingPackageVersion = __require("vite-plugin-hyperlog-darwin-universal/package.json").version;
				if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
				return binding;
			} catch (e) {
				loadErrors.push(e);
			}
			if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-hyperlog.darwin-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-darwin-x64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-darwin-x64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-hyperlog.darwin-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-darwin-arm64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-darwin-arm64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on macOS: ${process.arch}`));
		} else if (process.platform === "freebsd") {
			if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-hyperlog.freebsd-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-freebsd-x64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-freebsd-x64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-hyperlog.freebsd-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-freebsd-arm64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-freebsd-arm64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on FreeBSD: ${process.arch}`));
		} else if (process.platform === "linux") {
			if (process.arch === "x64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-hyperlog.linux-x64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-x64-musl");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-x64-musl/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.linux-x64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-x64-gnu");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-x64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "arm64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-hyperlog.linux-arm64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-arm64-musl");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-arm64-musl/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.linux-arm64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-arm64-gnu");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-arm64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "arm") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-hyperlog.linux-arm-musleabihf.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-arm-musleabihf");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-arm-musleabihf/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.linux-arm-gnueabihf.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-arm-gnueabihf");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-arm-gnueabihf/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "loong64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-hyperlog.linux-loong64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-loong64-musl");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-loong64-musl/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.linux-loong64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-loong64-gnu");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-loong64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "riscv64") {
				if (isMusl()) {
					try {
						return __require("../vite-plugin-hyperlog.linux-riscv64-musl.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-riscv64-musl");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-riscv64-musl/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				} else {
					try {
						return __require("../vite-plugin-hyperlog.linux-riscv64-gnu.node");
					} catch (e) {
						loadErrors.push(e);
					}
					try {
						const binding = __require("vite-plugin-hyperlog-linux-riscv64-gnu");
						const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-riscv64-gnu/package.json").version;
						if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
						return binding;
					} catch (e) {
						loadErrors.push(e);
					}
				}
			} else if (process.arch === "ppc64") {
				try {
					return __require("../vite-plugin-hyperlog.linux-ppc64-gnu.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-linux-ppc64-gnu");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-ppc64-gnu/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "s390x") {
				try {
					return __require("../vite-plugin-hyperlog.linux-s390x-gnu.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-linux-s390x-gnu");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-linux-s390x-gnu/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else loadErrors.push(/* @__PURE__ */ new Error(`Unsupported architecture on Linux: ${process.arch}`));
		} else if (process.platform === "openharmony") {
			if (process.arch === "arm64") {
				try {
					return __require("../vite-plugin-hyperlog.openharmony-arm64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-openharmony-arm64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-openharmony-arm64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "x64") {
				try {
					return __require("../vite-plugin-hyperlog.openharmony-x64.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-openharmony-x64");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-openharmony-x64/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					return binding;
				} catch (e) {
					loadErrors.push(e);
				}
			} else if (process.arch === "arm") {
				try {
					return __require("../vite-plugin-hyperlog.openharmony-arm.node");
				} catch (e) {
					loadErrors.push(e);
				}
				try {
					const binding = __require("vite-plugin-hyperlog-openharmony-arm");
					const bindingPackageVersion = __require("vite-plugin-hyperlog-openharmony-arm/package.json").version;
					if (bindingPackageVersion !== "0.3.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
				candidateError = __napiWasiResolveCandidate("./vite-plugin-hyperlog.wasi.cjs", false, ["./vite-plugin-hyperlog.wasm32-wasi.debug.wasm", "./vite-plugin-hyperlog.wasm32-wasi.wasm"]);
				candidateFailed = candidateError !== null;
				if (!candidateFailed) {
					wasiBinding = __require("./vite-plugin-hyperlog.wasi.cjs");
					nativeBinding = wasiBinding;
					__napiLoadedBindingTarget = "wasm32-wasi";
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
				candidateError = __napiWasiResolveCandidate("vite-plugin-hyperlog-wasm32-wasi", true, void 0);
				candidateFailed = candidateError !== null;
				if (!candidateFailed) {
					if (process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") {
						const bindingPackageVersion = __require("vite-plugin-hyperlog-wasm32-wasi/package.json").version;
						if (bindingPackageVersion !== "0.3.0") throw new Error(`WASI binding package version mismatch, expected 0.3.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
					}
					wasiBinding = __require("vite-plugin-hyperlog-wasm32-wasi");
					nativeBinding = wasiBinding;
					__napiLoadedBindingTarget = "wasm32-wasi";
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
	function __napiStampBindingTarget(exportsObject, target) {
		if (Object.prototype.hasOwnProperty.call(exportsObject, "__napiBindingTarget")) {
			if (exportsObject.__napiBindingTarget === target) return target;
			const error = /* @__PURE__ */ new Error("`__napiBindingTarget` is reserved by the generated binding loader, but the loaded binding already exports it. Rename the export, e.g. #[napi(js_name = \"...\")].");
			error.code = "ERR_NAPI_BINDING_TARGET_CONFLICT";
			throw error;
		}
		if (!Object.isExtensible(exportsObject)) return target;
		try {
			Object.defineProperty(exportsObject, "__napiBindingTarget", {
				configurable: true,
				enumerable: true,
				value: target,
				writable: true
			});
		} catch {}
		return target;
	}
	module.exports.__napiBindingTarget = __napiStampBindingTarget(nativeBinding, __napiLoadedBindingTarget);
	module.exports = nativeBinding;
	module.exports.decodeServerFn = nativeBinding.decodeServerFn;
	module.exports.formatBrowserLog = nativeBinding.formatBrowserLog;
	module.exports.formatGraphReevaluation = nativeBinding.formatGraphReevaluation;
	module.exports.formatLogEntry = nativeBinding.formatLogEntry;
	module.exports.formatRouteLog = nativeBinding.formatRouteLog;
	module.exports.formatServerFnLog = nativeBinding.formatServerFnLog;
	module.exports.formatServerFnPayload = nativeBinding.formatServerFnPayload;
	module.exports.getBrowserLoggerScript = nativeBinding.getBrowserLoggerScript;
	module.exports.getServerFnOverlayScript = nativeBinding.getServerFnOverlayScript;
	module.exports.isModuleRequest = nativeBinding.isModuleRequest;
	module.exports.matchesExclusion = nativeBinding.matchesExclusion;
	module.exports.matchRoutePath = nativeBinding.matchRoutePath;
	module.exports.parseRouteTreeAst = nativeBinding.parseRouteTreeAst;
	module.exports.remapSourcePosition = nativeBinding.remapSourcePosition;
	module.exports.remapStackTrace = nativeBinding.remapStackTrace;
	module.exports.shouldExcludeRequest = nativeBinding.shouldExcludeRequest;
}));
//#endregion
//#region src/graph.ts
var import_vite_plugin_logger = require_vite_plugin_logger();
/** Repeated module requests within one page load that suggest a graph re-walk. */
const REPEAT_THRESHOLD = 8;
/**
* Minimum number of *distinct* modules that must have been repeated.
*
* Without this floor, repeatedly fetching a single module (polling, a prefetch
* retry, a flaky asset) trips the detector and reports a graph re-evaluation
* that never happened.
*/
const MIN_DISTINCT_REPEATED = 5;
/**
* Watches module traffic for the signature of a graph re-evaluation: many
* distinct modules being requested a second time with no document request in
* between.
*
* That pattern means the entry graph ran twice inside a single page load, which
* in practice comes from a duplicate `<script type="module">` in `index.html` or
* a cache-busted dynamic `import()` of the entry module.
*/
var GraphReevaluationDetector = class {
	now;
	seen = /* @__PURE__ */ new Set();
	repeated = /* @__PURE__ */ new Set();
	repeats = 0;
	pageStart;
	reported = false;
	constructor(now = () => performance.now()) {
		this.now = now;
		this.pageStart = now();
	}
	/**
	* Feeds one request URL.
	*
	* Returns a report exactly once per page load, when the traffic looks like a
	* re-walk. Any non-module request is treated as a document request and resets
	* the per-page-load state.
	*/
	observe(isModule, url) {
		if (!isModule) {
			this.seen.clear();
			this.repeated.clear();
			this.repeats = 0;
			this.reported = false;
			this.pageStart = this.now();
			return null;
		}
		if (!this.seen.has(url)) {
			this.seen.add(url);
			return null;
		}
		this.repeats += 1;
		this.repeated.add(url);
		if (this.reported) return null;
		if (this.repeats < REPEAT_THRESHOLD) return null;
		if (this.repeated.size < MIN_DISTINCT_REPEATED) return null;
		this.reported = true;
		return {
			distinctModules: this.seen.size,
			repeatedRequests: this.repeats,
			windowMs: this.now() - this.pageStart
		};
	}
};
//#endregion
//#region src/server-fn-utils.ts
/**
* Safely format any JavaScript value (including circular objects, errors, FormData)
* into a compact, human-readable string representation without external dependencies.
*/
function formatPayload(val, options, depth = 0, seen = /* @__PURE__ */ new WeakSet()) {
	const maxDepth = options?.maxDepth ?? 2;
	const maxBreadth = options?.maxBreadth ?? 3;
	const maxStrLen = options?.maxStringLength ?? 40;
	if (val === void 0) return "undefined";
	if (val === null) return "null";
	if (val === true) return "true";
	if (val === false) return "false";
	if (Buffer.isBuffer(val)) return val.toString("utf-8");
	const tag = Object.prototype.toString.call(val);
	if (tag === "[object String]") {
		const s = val;
		if (s.length > maxStrLen) return JSON.stringify(s.slice(0, maxStrLen) + "…");
		return JSON.stringify(s);
	}
	if (tag === "[object Number]") return String(val);
	if (tag === "[object BigInt]") return `${val}n`;
	if (tag === "[object Symbol]") return val.toString();
	if (tag === "[object Function]") {
		const fn = val;
		return fn.name ? `ƒ ${fn.name}()` : "ƒ()";
	}
	if (Boolean(val) && (tag === "[object Object]" || Array.isArray(val) || val instanceof Error || tag === "[object FormData]" || tag === "[object URLSearchParams]")) {
		if (seen.has(val)) return "[Circular]";
		seen.add(val);
	}
	if (val instanceof Error) return val.name ? `${val.name}: ${val.message}` : val.message || "Error";
	if (depth >= maxDepth) {
		if (Array.isArray(val)) return `[Array(${val.length})]`;
		return "[Object]";
	}
	if (Array.isArray(val)) {
		if (val.length === 0) return "[]";
		const items = [];
		const len = Math.min(val.length, maxBreadth);
		for (let i = 0; i < len; i++) items.push(formatPayload(val[i], options, depth + 1, seen));
		if (val.length > maxBreadth) items.push(`…+${val.length - maxBreadth} more`);
		return `[${items.join(", ")}]`;
	}
	if (tag === "[object FormData]" || tag === "[object URLSearchParams]" || Boolean(val) && Boolean(val.entries)) {
		const entries = [];
		try {
			for (const [k, v] of val.entries()) {
				entries.push([k, v]);
				if (entries.length >= maxBreadth) break;
			}
			const fields = entries.map(([k, v]) => {
				return `${k}: ${Object.prototype.toString.call(v) === "[object Object]" && Boolean(v) && "name" in v ? String(v.name) : formatPayload(v, options, depth + 1, seen)}`;
			});
			return `${val.constructor?.name || "FormData"} { ${fields.join(", ")} }`;
		} catch {
			return `[${val.constructor?.name || "FormData"}]`;
		}
	}
	const keys = Object.keys(val);
	if (keys.length === 0) return "{}";
	const fields = [];
	const len = Math.min(keys.length, maxBreadth);
	for (let i = 0; i < len; i++) {
		const k = keys[i];
		let propVal;
		try {
			propVal = val[k];
		} catch {
			propVal = "[Unreadable]";
		}
		const formattedVal = formatPayload(propVal, options, depth + 1, seen);
		fields.push(`${k}: ${formattedVal}`);
	}
	if (keys.length > maxBreadth) fields.push(`…+${keys.length - maxBreadth} more`);
	return `{ ${fields.join(", ")} }`;
}
/**
* Decodes TanStack Start base64 payload into function and file path.
*/
function decodeTanStackServerFn(url) {
	const decoded = (0, import_vite_plugin_logger.decodeServerFn)(url);
	if (!decoded) return null;
	return {
		functionName: decoded.functionName,
		filePath: decoded.filePath
	};
}
/**
* Detects server function / action details across frameworks (TanStack Start, React 19 / RSC, Astro).
*/
function detectServerFunction(url, headers, customResolver, req) {
	if (customResolver && req) {
		const custom = customResolver(req);
		if (custom) return custom;
	}
	if (url.startsWith("/_serverFn")) {
		const tanstack = decodeTanStackServerFn(url);
		if (tanstack) return tanstack;
		return {
			functionName: "serverFn",
			filePath: "src"
		};
	}
	const rawAction = headers["next-action"] || headers["rsc-action-id"] || headers["x-action-name"];
	const nextAction = Array.isArray(rawAction) ? rawAction[0] : rawAction;
	if (nextAction) {
		const actStr = String(nextAction);
		return {
			functionName: actStr.length > 24 ? actStr.slice(0, 16) + "…" : actStr,
			filePath: "server action"
		};
	}
	if (url.startsWith("/_actions/")) {
		const actionPath = url.slice(10).split("?")[0];
		if (actionPath) return {
			functionName: actionPath,
			filePath: "src/actions"
		};
	}
	return null;
}
/**
* Safely parses server function arguments from request body bytes or query string.
*/
function parseServerFnArgs(url, method, headers, bodyBytes) {
	try {
		if (method === "GET") {
			const qIndex = url.indexOf("?");
			if (qIndex !== -1) {
				const query = url.slice(qIndex + 1);
				const params = new URLSearchParams(query);
				const dataParam = params.get("data") || params.get("args") || params.get("payload");
				if (dataParam) try {
					return JSON.parse(dataParam);
				} catch {
					return dataParam;
				}
			}
			return;
		}
		if (bodyBytes.length === 0) return void 0;
		const rawBody = Buffer.concat(bodyBytes).toString("utf-8");
		if (!rawBody.trim()) return void 0;
		const contentType = String(headers["content-type"] || "");
		if (contentType.includes("application/json") || rawBody.startsWith("{") || rawBody.startsWith("[")) try {
			const parsed = JSON.parse(rawBody);
			if (Boolean(parsed) && Object.prototype.toString.call(parsed) === "[object Object]" && "data" in parsed) return parsed.data;
			return parsed;
		} catch {
			return rawBody.slice(0, 100);
		}
		if (contentType.includes("application/x-www-form-urlencoded")) {
			const params = new URLSearchParams(rawBody);
			const obj = {};
			for (const [k, v] of params.entries()) obj[k] = v;
			return obj;
		}
		return rawBody.slice(0, 80);
	} catch {
		return;
	}
}
/**
* Safely parses server function return value or error from response body bytes.
*/
function parseServerFnResult(statusCode, resBytes) {
	try {
		if (resBytes.length === 0) return void 0;
		const rawRes = Buffer.concat(resBytes).toString("utf-8");
		if (!rawRes.trim()) return void 0;
		try {
			const parsed = JSON.parse(rawRes);
			if (statusCode >= 400) {
				if (Boolean(parsed) && Object.prototype.toString.call(parsed) === "[object Object]") return parsed.message || parsed.error || parsed;
			}
			return parsed;
		} catch {
			return rawRes.slice(0, 100);
		}
	} catch {
		return;
	}
}
//#endregion
//#region src/ui.ts
/**
* In-browser DevTools Overlay and Console Mirror script for Server Functions.
* Compiled into and served from the native Rust binary via NAPI-RS.
*/
function getServerFunctionOverlayScript() {
	return (0, import_vite_plugin_logger.getServerFnOverlayScript)();
}
//#endregion
//#region src/plugin.ts
const DEFAULT_EXCLUDE_URLS = [
	"?import",
	"vite_ping",
	"@fs",
	"/@vite",
	"/@id/",
	"/@react-refresh",
	"/node_modules/",
	"/.well-known",
	"/__hyperlog"
];
/** Maximum accepted body size for the SPA route reporting endpoint. */
const MAX_ROUTE_BODY_BYTES = 65536;
/**
* Collects a request body as bytes.
*
* Concatenating chunks with `body += chunk` decodes each Buffer independently, so
* a multi-byte character split across a chunk boundary is silently corrupted.
* Buffering the raw bytes and decoding once at the end avoids that.
*/
function readBody(req, res, limit) {
	return new Promise((resolve) => {
		const chunks = [];
		let size = 0;
		let settled = false;
		const done = (value) => {
			if (settled) return;
			settled = true;
			resolve(value);
		};
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > limit) {
				if (!res.headersSent) {
					res.statusCode = 413;
					res.end();
				}
				req.destroy();
				done(null);
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => done(Buffer.concat(chunks)));
		req.on("error", () => done(null));
		req.on("aborted", () => done(null));
	});
}
/** Logs one client-reported SPA route transition. */
function logRouteEvent(data) {
	const logString = (0, import_vite_plugin_logger.formatRouteLog)(data.routeId || data.path || "", data.path || "", data.params ?? null, data.durationMs ? Number(data.durationMs) : null, Boolean(data.isPreload));
	if (logString) console.log(logString);
}
/**
* Attaches the SPA route reporting endpoint exactly once per dev server.
*
* `requestLogger`, `browserLogger`, and the TanStack adapter all want this route,
* and registering it from more than one place produced copies that had already
* started to drift (including the chunked-UTF-8 body bug). The WeakSet keeps the
* first registration regardless of plugin order.
*/
const routeEndpointServers = /* @__PURE__ */ new WeakSet();
function attachRouteEndpoint(server, onRoute = logRouteEvent) {
	if (routeEndpointServers.has(server)) return;
	routeEndpointServers.add(server);
	server.middlewares.use((req, res, next) => {
		if (req.url !== "/__hyperlog/route" || req.method !== "POST") return next();
		readBody(req, res, MAX_ROUTE_BODY_BYTES).then((body) => {
			if (body) try {
				onRoute(JSON.parse(body.toString("utf8")));
			} catch {}
			if (!res.writableEnded && !res.headersSent) {
				res.statusCode = body ? 204 : 400;
				res.end();
			}
		});
	});
}
function requestLogger(config) {
	const excludeModules = config?.excludeModules ?? true;
	const groupRepeats = config?.groupRepeats ?? true;
	const repeatWindowMs = config?.repeatWindowMs ?? 1e3;
	const detectGraphReevaluation = config?.detectGraphReevaluation ?? true;
	const sf = config?.serverFunctions;
	const serverFnConfig = Boolean(sf) && sf !== true ? sf : null;
	const isServerFnLoggingEnabled = serverFnConfig !== null && serverFnConfig.enabled !== false;
	const serverFnFormat = serverFnConfig?.format ?? "tree";
	const exclusions = [
		...DEFAULT_EXCLUDE_URLS,
		...config?.excludeUrls || [],
		...config?.excludeApis ? ["/api"] : []
	];
	const excludedMethods = config?.excludeReqType ? new Set(config.excludeReqType.map((type) => type.toUpperCase())) : null;
	const resolveRoute = config?.resolveRoute;
	return {
		name: "vite-plugin-request-logging-rust",
		apply: "serve",
		configureServer(server) {
			const repeats = /* @__PURE__ */ new Map();
			const flushRepeat = (key, entry) => {
				repeats.delete(key);
				if (entry.count <= 1) return;
				const summary = (0, import_vite_plugin_logger.formatLogEntry)(entry.url, entry.method, entry.status, entry.totalDurationMs, null, null, null, entry.count);
				if (summary) console.log(summary);
			};
			server.httpServer?.on("close", () => {
				for (const [key, entry] of repeats) {
					clearTimeout(entry.timer);
					flushRepeat(key, entry);
				}
			});
			const detector = new GraphReevaluationDetector();
			const observe = (url) => {
				const report = detector.observe((0, import_vite_plugin_logger.isModuleRequest)(url), url);
				if (report) console.log((0, import_vite_plugin_logger.formatGraphReevaluation)(report.distinctModules, report.repeatedRequests, report.windowMs));
			};
			attachRouteEndpoint(server, logRouteEvent);
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				if (detectGraphReevaluation) observe(url);
				if (excludedMethods && excludedMethods.has(method.toUpperCase())) return next();
				if ((0, import_vite_plugin_logger.shouldExcludeRequest)(url, exclusions, excludeModules)) return next();
				const serverFnDetails = isServerFnLoggingEnabled ? detectServerFunction(url, req.headers, serverFnConfig?.resolveServerFn, req) : null;
				const bodyBytes = [];
				let totalBodyLen = 0;
				const MAX_CAPTURE_BYTES = 65536;
				if (serverFnDetails && serverFnConfig?.logArgs !== false && method !== "GET") {
					const origEmit = req.emit;
					req.emit = function(event, ...args) {
						if (event === "data" && totalBodyLen < MAX_CAPTURE_BYTES) {
							const chunk = args[0];
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							bodyBytes.push(b);
							totalBodyLen += b.length;
						}
						return origEmit.apply(this, [event, ...args]);
					};
				}
				const resBytes = [];
				let totalResLen = 0;
				if (serverFnDetails && serverFnConfig?.logReturns !== false) {
					const origWrite = res.write;
					const origEnd = res.end;
					res.write = function(chunk, ...args) {
						if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							resBytes.push(b);
							totalResLen += b.length;
						}
						return origWrite.apply(this, [chunk, ...args]);
					};
					res.end = function(chunk, ...args) {
						if (chunk && totalResLen < MAX_CAPTURE_BYTES) {
							const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
							resBytes.push(b);
							totalResLen += b.length;
						}
						return origEnd.apply(this, [chunk, ...args]);
					};
				}
				const start = performance.now();
				let logged = false;
				const logIt = (aborted) => {
					if (logged) return;
					logged = true;
					res.removeListener("finish", onFinish);
					res.removeListener("close", onClose);
					const durationMs = performance.now() - start;
					const status = aborted && !res.writableEnded ? 499 : res.statusCode;
					const cl = res.getHeader("content-length");
					const contentLength = cl ? Number(cl) : null;
					const location = res.getHeader("location");
					const redirectLocation = location ? String(location) : null;
					const routeName = resolveRoute ? resolveRoute(url) : null;
					if (serverFnDetails) {
						const parsedArgs = serverFnConfig?.logArgs !== false ? parseServerFnArgs(url, method, req.headers, bodyBytes) : void 0;
						const parsedResult = serverFnConfig?.logReturns !== false ? parseServerFnResult(status, resBytes) : void 0;
						const formattedArgs = parsedArgs !== void 0 ? formatPayload(parsedArgs, {
							maxDepth: serverFnConfig?.maxDepth,
							maxBreadth: serverFnConfig?.maxBreadth,
							maxStringLength: serverFnConfig?.maxStringLength
						}) : null;
						const formattedResult = parsedResult !== void 0 ? formatPayload(parsedResult, {
							maxDepth: serverFnConfig?.maxDepth,
							maxBreadth: serverFnConfig?.maxBreadth,
							maxStringLength: serverFnConfig?.maxStringLength
						}) : null;
						if (serverFnFormat === "tree") {
							const requestLine = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
							if (requestLine) console.log(requestLine);
							const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(serverFnDetails.functionName, serverFnDetails.filePath, serverFnDetails.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, true, null);
							if (fnLine) console.log(fnLine);
						} else {
							const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(serverFnDetails.functionName, serverFnDetails.filePath, serverFnDetails.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, false, null);
							if (fnLine) console.log(fnLine);
						}
						try {
							server.ws.send({
								type: "custom",
								event: "vite-plugin-hyperlog:server-fn",
								data: {
									name: serverFnDetails.functionName,
									file: serverFnDetails.filePath,
									status,
									durationMs,
									args: parsedArgs,
									result: parsedResult,
									browserConsole: Boolean(serverFnConfig?.browserConsole)
								}
							});
						} catch {}
						return;
					}
					if (!groupRepeats) {
						const line = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
						if (line) console.log(line);
						return;
					}
					const key = `${method} ${url}`;
					const existing = repeats.get(key);
					if (existing) {
						existing.count += 1;
						existing.totalDurationMs += durationMs;
						existing.status = status;
						clearTimeout(existing.timer);
						existing.timer = setTimeout(() => flushRepeat(key, existing), repeatWindowMs);
						return;
					}
					const line = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
					if (line) console.log(line);
					const entry = {
						timer: setTimeout(() => {}, 0),
						count: 1,
						totalDurationMs: durationMs,
						status,
						method,
						url
					};
					entry.timer = setTimeout(() => flushRepeat(key, entry), repeatWindowMs);
					repeats.set(key, entry);
				};
				const onFinish = () => logIt(false);
				const onClose = () => logIt(true);
				res.on("finish", onFinish);
				res.on("close", onClose);
				next();
			});
		}
	};
}
/**
* Builds the dev URL for the browser logger virtual module.
*
* Vite serves virtual modules under `/@id/` with the leading NUL encoded as
* `__x00__`, and prefixes that with the resolved `base`. Hardcoding the URL breaks
* any app served from a sub-path.
*
* @internal exported for tests
*/
function browserLoggerScriptSrc(base) {
	return `${base.endsWith("/") ? base : `${base}/`}@id/__x00__virtual:browser-logger`;
}
function browserLogger(config) {
	const virtualModuleId = "virtual:browser-logger";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;
	let base = "/";
	return {
		name: "vite-plugin-browser-logger",
		apply: "serve",
		enforce: "pre",
		configResolved(cfg) {
			base = cfg.base;
		},
		resolveId(id) {
			if (id === virtualModuleId || id === resolvedVirtualModuleId || id.endsWith(virtualModuleId)) return resolvedVirtualModuleId;
		},
		load(id) {
			if (id === resolvedVirtualModuleId || id.endsWith(virtualModuleId)) {
				const baseScript = (0, import_vite_plugin_logger.getBrowserLoggerScript)();
				const uiScript = config?.serverFunctionUi !== false ? getServerFunctionOverlayScript() : "";
				return baseScript + "\n" + uiScript;
			}
		},
		transformIndexHtml() {
			return [{
				tag: "script",
				attrs: {
					type: "module",
					src: browserLoggerScriptSrc(base)
				},
				injectTo: "head-prepend"
			}];
		},
		configureServer(server) {
			const pendingBrowserLogs = /* @__PURE__ */ new Map();
			const MAX_PENDING_LOGS = 250;
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
					if (existing.count >= 20) {
						clearTimeout(existing.timer);
						flushBrowserLog(key);
						return;
					}
					clearTimeout(existing.timer);
					existing.timer = setTimeout(() => flushBrowserLog(key), 80);
					return;
				}
				if (pendingBrowserLogs.size >= MAX_PENDING_LOGS) {
					const firstKey = pendingBrowserLogs.keys().next().value;
					if (firstKey) flushBrowserLog(firstKey);
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
			server.ws.on("vite-plugin-hyperlog:browser-log", handleBrowserLog);
			attachRouteEndpoint(server, logRouteEvent);
		}
	};
}
/**
* Convenient unified plugin that registers both requestLogger and browserLogger in one call.
*
* @example
* ```ts
* import logger from "vite-plugin-hyperlog";
* export default defineConfig({
*   plugins: [logger()],
* });
* ```
*/
function logger(config) {
	const sf = config?.serverFunctions;
	const sfConfig = Boolean(sf) && sf !== true ? sf : void 0;
	const uiEnabled = config?.serverFunctions !== false && sfConfig?.ui !== false;
	return [requestLogger(config), browserLogger({ serverFunctionUi: uiEnabled })];
}
/**
* Factory helper for framework-specific adapters (React, Solid, Svelte, Vue)
* that injects default framework-specific exclusions while keeping behavior unified.
*/
function createFrameworkLogger(defaultExclude) {
	function reqLogger(config) {
		return requestLogger({
			...config,
			excludeUrls: [defaultExclude, ...config?.excludeUrls || []]
		});
	}
	function log(config) {
		const sf = config?.serverFunctions;
		const sfConfig = Boolean(sf) && sf !== true ? sf : void 0;
		const uiEnabled = config?.serverFunctions !== false && sfConfig?.ui !== false;
		return [reqLogger(config), browserLogger({ serverFunctionUi: uiEnabled })];
	}
	return {
		requestLogger: reqLogger,
		logger: log
	};
}
//#endregion
export { import_vite_plugin_logger as a, requestLogger as c, formatPayload as d, parseServerFnArgs as f, createFrameworkLogger as i, getServerFunctionOverlayScript as l, require_vite_plugin_logger as m, browserLogger as n, logRouteEvent as o, parseServerFnResult as p, browserLoggerScriptSrc as r, logger as s, attachRouteEndpoint as t, detectServerFunction as u };
