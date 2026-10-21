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
	module.exports.observeRequest = nativeBinding.observeRequest;
	module.exports.parseRouteTreeAst = nativeBinding.parseRouteTreeAst;
	module.exports.registerExclusionConfig = nativeBinding.registerExclusionConfig;
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
//#region src/log-sink.ts
/**
* Central terminal output pipeline for the dev plugins.
*
* Three responsibilities, applied in order:
*
* 1. Color policy — the native formatters always emit ANSI. When the output
*    target cannot render it (piped output, CI, captured test streams) or
*    `NO_COLOR` is set, sequences are stripped here. `FORCE_COLOR` overrides
*    both and keeps the colors, matching the de-facto CLI convention.
* 2. Batching — a Vite request tick can emit several lines back to back and
*    `console.log` pays synchronous write overhead per call. Lines are
*    coalesced into one `process.stdout.write` per microtask, which keeps
*    ordering inside a tick and cuts syscalls dramatically on busy pages.
* 3. Machine mode — with `json: true` events are emitted as compact NDJSON
*    rows instead of pretty lines, so the stream can be piped into `jq`,
*    a file, or a log collector unchanged.
*/
const ANSI_PATTERN = /* @__PURE__ */ new RegExp("[\\u001B\\u009B][\\[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", "g");
/** Removes ANSI escape sequences (SGR, cursor movement, OSC...) from a string. */
function stripAnsi(value) {
	if (!ANSI_PATTERN.test(value)) return value;
	ANSI_PATTERN.lastIndex = 0;
	return value.replace(ANSI_PATTERN, "");
}
/**
* `NO_COLOR` disables colors whenever it is set to any non-empty value
* (https://no-color.org/). `FORCE_COLOR` wins over `NO_COLOR`, so CI setups can
* force colors into a captured log with `FORCE_COLOR=1`. Unset `FORCE_COLOR`
* returns `null`, meaning "honor TTY detection".
*/
function readNoColor() {
	const value = process.env.NO_COLOR;
	return value !== void 0 && value !== "";
}
function readForceColor() {
	const value = process.env.FORCE_COLOR;
	if (value === void 0 || value === "") return null;
	return !(value === "0" || value === "false");
}
/** Builds the canonical NDJSON row for one HTTP result, shared by every adapter. */
function buildRequestEvent(url, method, status, durationMs, extras = {}) {
	return {
		kind: "request",
		ts: Date.now(),
		url,
		method,
		status,
		durationMs,
		...extras
	};
}
function createLogSink(options = {}) {
	const writer = options.writer ?? process.stdout;
	const isRealTerminal = writer === process.stdout && process.stdout.isTTY === true;
	const forceColor = readForceColor();
	const noColor = readNoColor();
	const autoStrip = forceColor === false || !forceColor && (noColor || !isRealTerminal);
	const stripColors = options.stripColors === false ? true : autoStrip;
	const jsonMode = options.json === true;
	let batch = [];
	let flushQueued = false;
	const flush = () => {
		flushQueued = false;
		if (batch.length === 0) return;
		const out = `${batch.join("\n")}\n`;
		batch = [];
		try {
			writer.write(out);
		} catch {}
	};
	return {
		json: jsonMode,
		flush,
		print(line, event) {
			if (!line || line.length === 0) return;
			const text = stripColors ? stripAnsi(line) : line;
			let out;
			if (jsonMode) out = JSON.stringify(event ?? {
				kind: "line",
				ts: Date.now(),
				line: text
			});
			else out = text;
			batch.push(out);
			if (!flushQueued) {
				flushQueued = true;
				queueMicrotask(flush);
			}
		}
	};
}
function createSummaryTracker(options = {}) {
	const windowMs = Math.max(200, options.windowMs ?? 1e4);
	const minSamples = Math.max(2, options.minSamples ?? 5);
	let durations = [];
	let windowStartAt = 0;
	return {
		record(durationMs) {
			if (!Number.isFinite(durationMs) || durationMs < 0) return;
			if (durations.length === 0) windowStartAt = performance.now();
			durations.push(durationMs);
			if (durations.length > 2048) durations = durations.slice(durations.length - 2048);
		},
		poll() {
			if (durations.length === 0) return null;
			if (performance.now() - windowStartAt < windowMs) return null;
			const count = durations.length;
			const sorted = durations.slice();
			durations = [];
			windowStartAt = performance.now();
			if (count < minSamples) return null;
			sorted.sort((a, b) => a - b);
			const quantile = (p) => {
				const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1));
				return sorted[rank] ?? 0;
			};
			return {
				count,
				p50: quantile(.5),
				p95: quantile(.95),
				p99: quantile(.99)
			};
		}
	};
}
const DIM = "\x1B[2m";
const RESET = "\x1B[0m";
const COLOR_OK = "\x1B[32m";
const COLOR_MID = "\x1B[33m";
const COLOR_SLOW = "\x1B[31m";
function latencyColor(ms) {
	if (ms < 50) return COLOR_OK;
	if (ms < 200) return COLOR_MID;
	return COLOR_SLOW;
}
const formatMs = (value) => {
	const text = value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value).toFixed(0);
	return text.endsWith(".0") ? text.slice(0, -2) : text;
};
/** Single dim footer line, e.g. `└─ last 10s · p50 1.2ms · p95 9.4ms · p99 31ms · 87 reqs`. */
function formatSummaryLine(sample, windowMs) {
	const fmt = (value) => `${latencyColor(value)}${formatMs(value)}ms${RESET}`;
	return `└─ ${DIM}${Math.round(windowMs / 1e3)}s${RESET} p50 ${fmt(sample.p50)} · p95 ${fmt(sample.p95)} · p99 ${fmt(sample.p99)} · ${DIM}${sample.count} reqs${RESET}`;
}
//#endregion
//#region src/server-fn-utils.ts
/**
* Concatenates captured chunks into one Buffer.
*
* Buffer chunks are used as-is; string chunks are encoded at the end so that a
* multi-byte character split across separate string chunks still joins into a
* single complete character (string concatenation preserves the decoder's
* boundary handling).
*/
function concatChunks(chunks) {
	if (chunks.length === 0) return Buffer.alloc(0);
	if (chunks.length === 1) {
		const [only] = chunks;
		return Buffer.isBuffer(only) ? only : Buffer.from(only, "utf8");
	}
	const parts = [];
	let pendingStrings = [];
	for (const chunk of chunks) if (Buffer.isBuffer(chunk)) {
		if (pendingStrings.length > 0) {
			parts.push(Buffer.from(pendingStrings.join(""), "utf8"));
			pendingStrings = [];
		}
		parts.push(chunk);
	} else pendingStrings.push(chunk);
	if (pendingStrings.length > 0) parts.push(Buffer.from(pendingStrings.join(""), "utf8"));
	return Buffer.concat(parts);
}
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
		const rawBody = concatChunks(bodyBytes).toString("utf-8");
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
		const rawRes = concatChunks(resBytes).toString("utf-8");
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
/** Maximum captured request/response body size per server-function request. */
const MAX_CAPTURE_BYTES = 65536;
/**
* Attaches body capture to a server-function request/response pair.
*
* Requests are observed with a plain `"data"` listener instead of monkey-patching
* `req.emit`: the listener is the standard middleware pattern (same one that
* body-parsing middleware itself uses) and avoids replacing a function on every
* request. Chunks are stored in their original representation and joined once at
* logging time (`concatChunks`), so a multi-byte character split across chunks
* survives.
*/
function captureServerFnBodies(req, res, captureArgs, captureReturns) {
	const bodyBytes = [];
	const resBytes = [];
	let totalBodyLen = 0;
	let totalResLen = 0;
	if (captureArgs) req.on("data", (chunk) => {
		if (chunk == null || totalBodyLen >= 65536) return;
		bodyBytes.push(chunk);
		totalBodyLen += chunk.length;
	});
	if (captureReturns) {
		const origWrite = res.write;
		const origEnd = res.end;
		res.write = function(chunk, ...args) {
			if (chunk && totalResLen < 65536) {
				resBytes.push(chunk);
				totalResLen += chunk.length;
			}
			return origWrite.apply(this, [chunk, ...args]);
		};
		res.end = function(chunk, ...args) {
			if (chunk && totalResLen < 65536) {
				resBytes.push(chunk);
				totalResLen += chunk.length;
			}
			return origEnd.apply(this, [chunk, ...args]);
		};
	}
	return {
		bodyBytes,
		resBytes
	};
}
/**
* Formats and prints one finished server-function call (plus the enclosing
* request line in `tree` mode) and pushes it to the DevTools HUD clients.
*
* Shared by both adapters so the tree/standalone rendering and the HUD payload
* cannot drift apart again.
*/
function logServerFnCall(options) {
	const { sink, details, status, durationMs, parsedArgs, parsedResult, outputFormat, limits, server, url, method } = options;
	const formattedArgs = parsedArgs !== void 0 ? formatPayload(parsedArgs, limits) : null;
	const formattedResult = parsedResult !== void 0 ? formatPayload(parsedResult, limits) : null;
	const ts = Date.now();
	if (outputFormat === "tree") {
		const requestLine = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, null, null, null, null);
		sink.print(requestLine, {
			kind: "request",
			ts,
			url,
			method,
			status,
			durationMs
		});
		const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(details.functionName, details.filePath, details.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, true, null);
		sink.print(fnLine, {
			kind: "server-fn",
			ts,
			name: details.functionName,
			file: details.filePath,
			line: details.lineNumber ?? null,
			status,
			durationMs,
			args: parsedArgs,
			result: parsedResult
		});
	} else {
		const fnLine = (0, import_vite_plugin_logger.formatServerFnLog)(details.functionName, details.filePath, details.lineNumber ?? null, status, durationMs, formattedArgs, formattedResult, false, null);
		sink.print(fnLine, {
			kind: "server-fn",
			ts,
			name: details.functionName,
			file: details.filePath,
			line: details.lineNumber ?? null,
			status,
			durationMs,
			args: parsedArgs,
			result: parsedResult
		});
	}
	try {
		server?.ws?.send({
			type: "custom",
			event: "vite-plugin-hyperlog:server-fn",
			data: {
				name: details.functionName,
				file: details.filePath,
				status,
				durationMs,
				args: parsedArgs,
				result: parsedResult,
				browserConsole: options.browserConsole === true
			}
		});
	} catch {}
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
/**
* Default request URL exclusions shared by every adapter. Root-anchored, so
* plugin code (e.g. `/src/foo.ts`) is never caught. TanStack layers its own
* extra patterns on top via `TANSTACK_EXCLUDE_PATTERNS`.
*/
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
let nextExclusionConfigId = 1;
/**
* Allocates a unique plugin-instance id for the native exclusion cache.
*
* Each `requestLogger` instance registers its own exclusion config under this
* id, so several plugins can coexist in one process without clobbering each
* other's configuration.
*/
function allocateExclusionConfigId() {
	return nextExclusionConfigId++;
}
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
/**
* Same-origin guard for the SPA route reporting endpoint.
*
* A browser `fetch`/XHR always sends an `Origin` header, so cross-site pages (or
* a DNS-rebinding attacker hitting the dev server directly) can be identified
* by shipping their requests with an `Origin` that does not match the `Host`
* the dev server received the request on. Those are *remote* forgeries and are
* rejected; same-page clients match, and header-less non-browser clients
* (curl, IDE tools) are unaffected.
*/
function isSameOriginDevRequest(origin, host) {
	if (!origin || !host) return false;
	let originHost;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}
	return originHost.toLowerCase() === host.toLowerCase();
}
/** Sink-backed route reporter shared by the HTTP endpoint and WS handlers. */
function routeEventSinkHandler(sink) {
	return (data) => {
		const logString = (0, import_vite_plugin_logger.formatRouteLog)(data.routeId || data.path || "", data.path || "", data.params ?? null, data.durationMs ? Number(data.durationMs) : null, Boolean(data.isPreload));
		sink.print(logString, {
			kind: "route",
			ts: Date.now(),
			routeId: data.routeId ?? null,
			path: data.path ?? null,
			params: data.params ?? null,
			durationMs: data.durationMs ? Number(data.durationMs) : null,
			isPreload: Boolean(data.isPreload)
		});
	};
}
/**
* Lazily-created module sink for standalone callers (direct `attachRouteEndpoint`
* use, custom integrations) so even those prints follow the same color policy,
* batching, and NDJSON shape as the plugin-managed output.
*/
let fallbackSink = null;
function moduleSink() {
	if (!fallbackSink) fallbackSink = createLogSink();
	return fallbackSink;
}
/** Logs one client-reported SPA route transition. */
function logRouteEvent(data) {
	routeEventSinkHandler(moduleSink())(data);
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
		const originHeader = req.headers?.origin;
		if (originHeader && !isSameOriginDevRequest(originHeader, req.headers?.host)) {
			res.statusCode = 403;
			res.end();
			return;
		}
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
	const jsonMode = config?.json === true;
	const summaryConfig = config?.summaryStats;
	const summaryEnabled = summaryConfig !== false;
	const summaryOptions = summaryEnabled && summaryConfig !== true ? summaryConfig ?? {} : {};
	const summaryWindowMs = Math.max(200, summaryOptions.windowMs ?? 1e4);
	const exclusionConfigId = allocateExclusionConfigId();
	(0, import_vite_plugin_logger.registerExclusionConfig)(exclusionConfigId, exclusions, excludeModules);
	return {
		name: "vite-plugin-request-logging-rust",
		apply: "serve",
		configureServer(server) {
			const repeats = /* @__PURE__ */ new Map();
			const sink = createLogSink({
				json: jsonMode,
				stripColors: config?.stripColors
			});
			const summary = summaryEnabled ? createSummaryTracker(summaryOptions) : null;
			let summaryFlushQueued = false;
			const flushRepeat = (key, entry) => {
				repeats.delete(key);
				if (entry.count <= 1) return;
				const repeatLine = (0, import_vite_plugin_logger.formatLogEntry)(entry.url, entry.method, entry.status, entry.totalDurationMs, null, null, null, entry.count);
				sink.print(repeatLine, buildRequestEvent(entry.url, entry.method, entry.status, entry.totalDurationMs, { repeat: entry.count }));
			};
			server.httpServer?.on("close", () => {
				for (const [key, entry] of repeats) {
					clearTimeout(entry.timer);
					flushRepeat(key, entry);
				}
				sink.flush();
			});
			const detector = new GraphReevaluationDetector();
			const observe = (isModule, url) => {
				const report = detector.observe(isModule, url);
				if (report) sink.print((0, import_vite_plugin_logger.formatGraphReevaluation)(report.distinctModules, report.repeatedRequests, report.windowMs), {
					kind: "graph",
					ts: Date.now(),
					distinctModules: report.distinctModules,
					repeatedRequests: report.repeatedRequests,
					windowMs: report.windowMs
				});
			};
			attachRouteEndpoint(server, routeEventSinkHandler(sink));
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				const observation = (0, import_vite_plugin_logger.observeRequest)(exclusionConfigId, url);
				if (detectGraphReevaluation) observe(observation.isModule, url);
				if (excludedMethods && excludedMethods.has(method.toUpperCase())) return next();
				if (observation.excluded) return next();
				const serverFnDetails = isServerFnLoggingEnabled ? detectServerFunction(url, req.headers, serverFnConfig?.resolveServerFn, req) : null;
				const { bodyBytes, resBytes } = captureServerFnBodies(req, res, serverFnDetails !== null && serverFnConfig?.logArgs !== false && method !== "GET", serverFnDetails !== null && serverFnConfig?.logReturns !== false);
				const start = performance.now();
				let logged = false;
				const logIt = (aborted) => {
					if (logged) return;
					logged = true;
					res.removeListener("finish", onFinish);
					res.removeListener("close", onClose);
					const durationMs = performance.now() - start;
					const status = aborted && !res.writableEnded ? 499 : res.statusCode;
					if (summary) {
						summary.record(durationMs);
						if (!summaryFlushQueued) {
							summaryFlushQueued = true;
							queueMicrotask(() => {
								summaryFlushQueued = false;
								const sample = summary.poll();
								if (sample) sink.print(formatSummaryLine(sample, summaryWindowMs), {
									kind: "summary",
									ts: Date.now(),
									windowMs: summaryWindowMs,
									...sample
								});
							});
						}
					}
					const cl = res.getHeader("content-length");
					const contentLength = cl ? Number(cl) : null;
					const location = res.getHeader("location");
					const redirectLocation = location ? String(location) : null;
					const routeName = resolveRoute ? resolveRoute(url) ?? null : null;
					if (serverFnDetails) {
						const parsedArgs = serverFnConfig?.logArgs !== false ? parseServerFnArgs(url, method, req.headers, bodyBytes) : void 0;
						const parsedResult = serverFnConfig?.logReturns !== false ? parseServerFnResult(status, resBytes) : void 0;
						logServerFnCall({
							server,
							sink,
							details: serverFnDetails,
							url,
							method,
							status,
							durationMs,
							parsedArgs,
							parsedResult,
							outputFormat: serverFnFormat === "tree" ? "tree" : "standalone",
							limits: {
								maxDepth: serverFnConfig?.maxDepth,
								maxBreadth: serverFnConfig?.maxBreadth,
								maxStringLength: serverFnConfig?.maxStringLength
							},
							browserConsole: serverFnConfig?.browserConsole === true
						});
						return;
					}
					if (!groupRepeats) {
						const line = (0, import_vite_plugin_logger.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
						sink.print(line, buildRequestEvent(url, method, status, durationMs, {
							contentLength,
							location: redirectLocation,
							route: routeName
						}));
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
					sink.print(line, buildRequestEvent(url, method, status, durationMs, {
						contentLength,
						location: redirectLocation,
						route: routeName
					}));
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
			const sink = createLogSink({
				json: config?.json === true,
				stripColors: config?.stripColors
			});
			const pendingBrowserLogs = /* @__PURE__ */ new Map();
			const MAX_PENDING_LOGS = 250;
			const PRINT_BUDGET_PER_SECOND = 400;
			let budgetStartAt = performance.now();
			let budgetUsed = 0;
			let budgetSuppressed = 0;
			const flushBrowserLog = (key) => {
				const entry = pendingBrowserLogs.get(key);
				if (!entry) return;
				pendingBrowserLogs.delete(key);
				const now = performance.now();
				if (now - budgetStartAt >= 1e3) {
					budgetStartAt = now;
					budgetUsed = 0;
					if (budgetSuppressed > 0) {
						const suppressed = budgetSuppressed;
						budgetSuppressed = 0;
						sink.print(`[hyperlog] ${suppressed} browser log rows suppressed (rate limit)`, {
							kind: "browser",
							ts: Date.now(),
							suppressed
						});
					}
				}
				if (budgetUsed >= PRINT_BUDGET_PER_SECOND) {
					budgetSuppressed += entry.count;
					return;
				}
				budgetUsed += entry.count;
				const logString = (0, import_vite_plugin_logger.formatBrowserLog)(entry.type, entry.message, entry.caller, entry.count > 1 ? entry.count : null);
				sink.print(logString, {
					kind: "browser",
					ts: Date.now(),
					type: entry.type,
					message: entry.message,
					caller: entry.caller,
					count: entry.count > 1 ? entry.count : null
				});
			};
			server.httpServer?.on("close", () => {
				for (const [key, entry] of pendingBrowserLogs.entries()) {
					clearTimeout(entry.timer);
					flushBrowserLog(key);
				}
				sink.flush();
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
			attachRouteEndpoint(server, routeEventSinkHandler(sink));
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
	return [requestLogger(config), browserLogger({
		serverFunctionUi: uiEnabled,
		json: config?.json === true,
		stripColors: config?.stripColors
	})];
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
		return [reqLogger(config), browserLogger({
			serverFunctionUi: uiEnabled,
			json: config?.json === true,
			stripColors: config?.stripColors
		})];
	}
	return {
		requestLogger: reqLogger,
		logger: log
	};
}
//#endregion
export { formatSummaryLine as C, require_vite_plugin_logger as D, stripAnsi as E, createSummaryTracker as S, readNoColor as T, logServerFnCall as _, browserLoggerScriptSrc as a, buildRequestEvent as b, logRouteEvent as c, routeEventSinkHandler as d, getServerFunctionOverlayScript as f, formatPayload as g, detectServerFunction as h, browserLogger as i, logger as l, captureServerFnBodies as m, allocateExclusionConfigId as n, createFrameworkLogger as o, MAX_CAPTURE_BYTES as p, attachRouteEndpoint as r, import_vite_plugin_logger as s, DEFAULT_EXCLUDE_URLS as t, requestLogger as u, parseServerFnArgs as v, readForceColor as w, createLogSink as x, parseServerFnResult as y };
