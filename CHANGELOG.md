# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial implementation of `@workflow-ts/core`
  - `WorkflowRuntime` class for managing workflow state
  - `createRuntime` factory function
  - Worker system for async operations with automatic lifecycle
  - Snapshot/restore utilities for state persistence
  - Type definitions for `Workflow`, `State`, `Rendering`, `Action`
  
- Initial implementation of `@workflow-ts/react`
  - `useWorkflow` hook for React integration
  - `useWorkflowWithState` hook for advanced use cases
  
- Comprehensive test suite (57 core tests)
- MIT License
- Contributing guidelines

### Documentation

- README with quick start guide
- Package-specific READMEs for core and react
- Code examples for counter, todo list, login flow
- Architecture comparison with Redux, XState, TCA

[Unreleased]: https://github.com/openclaw/workflow-ts/compare/v0.1.0...HEAD
