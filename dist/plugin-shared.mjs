import { createRequire } from "node:module";
//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region index.js
var require_vite_plugin_hyperlog = /* @__PURE__ */ __commonJSMin(((exports, module) => {
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
				if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
					if (bindingPackageVersion !== "0.2.0" && process.env.NAPI_RS_ENFORCE_VERSION_CHECK && process.env.NAPI_RS_ENFORCE_VERSION_CHECK !== "0") throw new Error(`Native binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
						if (bindingPackageVersion !== "0.2.0") throw new Error(`WASI binding package version mismatch, expected 0.2.0 but got ${bindingPackageVersion}. You can reinstall dependencies to fix this issue.`);
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
	module.exports.formatBrowserLog = nativeBinding.formatBrowserLog;
	module.exports.formatGraphReevaluation = nativeBinding.formatGraphReevaluation;
	module.exports.formatLogEntry = nativeBinding.formatLogEntry;
	module.exports.formatRouteLog = nativeBinding.formatRouteLog;
	module.exports.getBrowserLoggerScript = nativeBinding.getBrowserLoggerScript;
	module.exports.parseRouteTreeAst = nativeBinding.parseRouteTreeAst;
	module.exports.remapSourcePosition = nativeBinding.remapSourcePosition;
	module.exports.remapStackTrace = nativeBinding.remapStackTrace;
}));
//#endregion
//#region src/graph.ts
var import_vite_plugin_hyperlog = require_vite_plugin_hyperlog();
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
const SOURCE_MODULE_RE = /\.(?:tsx|ts|jsx|js|mjs|cjs|css|vue|svelte)$/;
/** Maximum accepted body size for the SPA route reporting endpoint. */
const MAX_ROUTE_BODY_BYTES = 65536;
/**
* Matches an exclusion pattern against a URL.
*
* Patterns starting with `/` are treated as path patterns and must align to
* segment boundaries, so `/api` matches `/api/users` but not `/api-key` or
* `/dashboard/apiSettings`. Everything else stays a substring match, which is
* what query-shaped patterns like `?import` need.
*
* @internal exported for tests
*/
function matchesExclusion(url, pattern) {
	if (!pattern.startsWith("/")) return url.includes(pattern);
	const queryIndex = url.indexOf("?");
	const pathname = queryIndex === -1 ? url : url.slice(0, queryIndex);
	let from = 0;
	for (;;) {
		const idx = pathname.indexOf(pattern, from);
		if (idx === -1) return false;
		const before = idx === 0 ? void 0 : pathname[idx - 1];
		const after = pathname[idx + pattern.length];
		const startsSegment = before === void 0 || before === "/";
		const endsSegment = pattern.endsWith("/") || after === void 0 || after === "/";
		if (startsSegment && endsSegment) return true;
		from = idx + 1;
	}
}
function toPathname(url) {
	const queryIndex = url.indexOf("?");
	return queryIndex === -1 ? url : url.slice(0, queryIndex);
}
/**
* True when the URL is a source or dependency module rather than an app request.
*
* @internal exported for tests
*/
function isModuleRequest(url) {
	if (url.startsWith("/api") || url.startsWith("/_serverFn")) return false;
	const pathname = toPathname(url);
	if (pathname.startsWith("/@")) return true;
	if (pathname.includes("/node_modules/")) return true;
	return SOURCE_MODULE_RE.test(pathname) || pathname.startsWith("/src/");
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
/** Logs one client-reported SPA route transition. */
function logRouteEvent(data) {
	const logString = (0, import_vite_plugin_hyperlog.formatRouteLog)(data.routeId || data.path || "", data.path || "", data.params ?? null, data.durationMs ? Number(data.durationMs) : null, Boolean(data.isPreload));
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
				const summary = (0, import_vite_plugin_hyperlog.formatLogEntry)(entry.url, entry.method, entry.status, entry.totalDurationMs, null, null, null, entry.count);
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
				const report = detector.observe(isModuleRequest(url), url);
				if (report) console.log((0, import_vite_plugin_hyperlog.formatGraphReevaluation)(report.distinctModules, report.repeatedRequests, report.windowMs));
			};
			attachRouteEndpoint(server, logRouteEvent);
			server.middlewares.use((req, res, next) => {
				const url = req.originalUrl || "";
				const method = req.method || "GET";
				if (detectGraphReevaluation) observe(url);
				if (excludedMethods && excludedMethods.has(method.toUpperCase())) return next();
				for (let i = 0; i < exclusions.length; i++) if (matchesExclusion(url, exclusions[i])) return next();
				if (excludeModules && isModuleRequest(url)) return next();
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
					if (!groupRepeats) {
						const line = (0, import_vite_plugin_hyperlog.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
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
					const line = (0, import_vite_plugin_hyperlog.formatLogEntry)(url, method, status, durationMs, contentLength, redirectLocation, routeName, null);
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
function browserLogger() {
	const virtualModuleId = "virtual:browser-logger";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;
	let base = "/";
	return {
		name: "vite-plugin-browser-logger",
		apply: "serve",
		enforce: "pre",
		configResolved(config) {
			base = config.base;
		},
		resolveId(id) {
			if (id === virtualModuleId || id === resolvedVirtualModuleId || id.endsWith(virtualModuleId)) return resolvedVirtualModuleId;
		},
		load(id) {
			if (id === resolvedVirtualModuleId || id.endsWith(virtualModuleId)) return (0, import_vite_plugin_hyperlog.getBrowserLoggerScript)();
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
				const logString = (0, import_vite_plugin_hyperlog.formatBrowserLog)(entry.type, entry.message, entry.caller, entry.count > 1 ? entry.count : null);
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
	return [requestLogger(config), browserLogger()];
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
		return [reqLogger(config), browserLogger()];
	}
	return {
		requestLogger: reqLogger,
		logger: log
	};
}
//#endregion
export { import_vite_plugin_hyperlog as a, logger as c, require_vite_plugin_hyperlog as d, createFrameworkLogger as i, matchesExclusion as l, browserLogger as n, isModuleRequest as o, browserLoggerScriptSrc as r, logRouteEvent as s, attachRouteEndpoint as t, requestLogger as u };
