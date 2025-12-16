"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  Key,
  Palette,
  Terminal,
  FlaskConical,
  Trash2,
  Settings2,
  Volume2,
} from "lucide-react";

import {
  useCliStatus,
  useSettingsView,
  type SettingsViewId,
} from "./settings-view/hooks";
import { SettingsHeader } from "./settings-view/components/settings-header";
import { KeyboardMapDialog } from "./settings-view/components/keyboard-map-dialog";
import { DeleteProjectDialog } from "./settings-view/components/delete-project-dialog";
import { SettingsNavigation } from "./settings-view/components/settings-navigation";
import { ApiKeysSection } from "./settings-view/api-keys/api-keys-section";
import { ClaudeCliStatus } from "./settings-view/cli-status/claude-cli-status";
import { AppearanceSection } from "./settings-view/appearance/appearance-section";
import { AudioSection } from "./settings-view/audio/audio-section";
import { KeyboardShortcutsSection } from "./settings-view/keyboard-shortcuts/keyboard-shortcuts-section";
import { FeatureDefaultsSection } from "./settings-view/feature-defaults/feature-defaults-section";
import { DangerZoneSection } from "./settings-view/danger-zone/danger-zone-section";
import type {
  Project as SettingsProject,
  Theme,
} from "./settings-view/shared/types";
import type { Project as ElectronProject } from "@/lib/electron";

// Navigation items for the side panel
const NAV_ITEMS = [
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "claude", label: "Claude", icon: Terminal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "keyboard", label: "Keyboard Shortcuts", icon: Settings2 },
  { id: "audio", label: "Audio", icon: Volume2 },
  { id: "defaults", label: "Feature Defaults", icon: FlaskConical },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];

export function SettingsView() {
  const {
    theme,
    setTheme,
    setProjectTheme,
    defaultSkipTests,
    setDefaultSkipTests,
    useWorktrees,
    setUseWorktrees,
    showProfilesOnly,
    setShowProfilesOnly,
    muteDoneSound,
    setMuteDoneSound,
    currentProject,
    moveProjectToTrash,
  } = useAppStore();

  // Convert electron Project to settings-view Project type
  const convertProject = (
    project: ElectronProject | null
  ): SettingsProject | null => {
    if (!project) return null;
    return {
      id: project.id,
      name: project.name,
      path: project.path,
      theme: project.theme as Theme | undefined,
    };
  };

  const settingsProject = convertProject(currentProject);

  // Compute the effective theme for the current project
  const effectiveTheme = (settingsProject?.theme || theme) as Theme;

  // Handler to set theme - always updates global theme (user's preference),
  // and also sets per-project theme if a project is selected
  const handleSetTheme = (newTheme: typeof theme) => {
    // Always update global theme so user's preference persists across all projects
    setTheme(newTheme);
    // Also set per-project theme if a project is selected
    if (currentProject) {
      setProjectTheme(currentProject.id, newTheme);
    }
  };

  // Use CLI status hook
  const { claudeCliStatus, isCheckingClaudeCli, handleRefreshClaudeCli } =
    useCliStatus();

  // Use settings view navigation hook
  const { activeView, navigateTo } = useSettingsView();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showKeyboardMapDialog, setShowKeyboardMapDialog] = useState(false);

  // Render the active section based on current view
  const renderActiveSection = () => {
    switch (activeView) {
      case "api-keys":
        return <ApiKeysSection />;
      case "claude":
        return (
          <ClaudeCliStatus
            status={claudeCliStatus}
            isChecking={isCheckingClaudeCli}
            onRefresh={handleRefreshClaudeCli}
          />
        );
      case "appearance":
        return (
          <AppearanceSection
            effectiveTheme={effectiveTheme}
            currentProject={settingsProject}
            onThemeChange={handleSetTheme}
          />
        );
      case "keyboard":
        return (
          <KeyboardShortcutsSection
            onOpenKeyboardMap={() => setShowKeyboardMapDialog(true)}
          />
        );
      case "audio":
        return (
          <AudioSection
            muteDoneSound={muteDoneSound}
            onMuteDoneSoundChange={setMuteDoneSound}
          />
        );
      case "defaults":
        return (
          <FeatureDefaultsSection
            showProfilesOnly={showProfilesOnly}
            defaultSkipTests={defaultSkipTests}
            useWorktrees={useWorktrees}
            onShowProfilesOnlyChange={setShowProfilesOnly}
            onDefaultSkipTestsChange={setDefaultSkipTests}
            onUseWorktreesChange={setUseWorktrees}
          />
        );
      case "danger":
        return (
          <DangerZoneSection
            project={settingsProject}
            onDeleteClick={() => setShowDeleteDialog(true)}
          />
        );
      default:
        return <ApiKeysSection />;
    }
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden content-bg"
      data-testid="settings-view"
    >
      {/* Header Section */}
      <SettingsHeader />

      {/* Content Area with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side Navigation - No longer scrolls, just switches views */}
        <SettingsNavigation
          navItems={NAV_ITEMS}
          activeSection={activeView}
          currentProject={currentProject}
          onNavigate={(id) => navigateTo(id as SettingsViewId)}
        />

        {/* Content Panel - Shows only the active section */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">{renderActiveSection()}</div>
        </div>
      </div>

      {/* Keyboard Map Dialog */}
      <KeyboardMapDialog
        open={showKeyboardMapDialog}
        onOpenChange={setShowKeyboardMapDialog}
      />

      {/* Delete Project Confirmation Dialog */}
      <DeleteProjectDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        project={currentProject}
        onConfirm={moveProjectToTrash}
      />
    </div>
  );
}
