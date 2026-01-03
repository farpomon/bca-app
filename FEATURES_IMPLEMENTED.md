# Building Templates & Service Life Features

## Features Implemented

### 1. Building Type Templates
- **Location**: `/admin/building-templates`
- **Description**: Pre-defined templates for different building types with standard systems and service life values
- **Features**:
  - Create, edit, and delete building type templates
  - Templates include property type, building class, construction type
  - Templates can have associated systems with default service life values
  - Search and filter templates by property type and building class
  - Company-specific and global templates supported

### 2. Design Service Life Values
- **Location**: `/admin/building-templates` (Service Life Values tab)
- **Description**: Standard service life values by component, building class, and property type
- **Features**:
  - Define service life values for UNIFORMAT II components
  - Values can vary by building class (Class A, B, C)
  - Values can vary by property type
  - Include min/max and best/worst case scenarios
  - Data source tracking for reference

### 3. Bulk Portfolio-Wide Service Life Updates
- **Location**: `/admin/bulk-service-life-updates`
- **Description**: Update service life values across entire portfolio
- **Features**:
  - Update by component, building class, property type, or all
  - Preview affected assessments before execution
  - Execute updates with audit trail
  - Rollback capability for completed updates
  - Track update history with status

### 4. New Building Setup Wizard
- **Component**: `NewBuildingWizard`
- **Description**: Step-by-step wizard for creating new buildings with pre-populated data
- **Features**:
  - Select from existing templates or start from scratch
  - Pre-populate building details from template
  - Pre-select systems from template
  - Multi-step wizard: Template → Details → Location → Systems → Review
  - Systems can be customized before creation

## Database Tables Created

1. `building_type_templates` - Building type template definitions
2. `template_systems` - Systems associated with each template
3. `design_service_life_values` - Standard service life values
4. `bulk_service_life_updates` - Bulk update records
5. `bulk_update_affected_items` - Items affected by bulk updates (for rollback)

## Navigation

- Building Templates: Sidebar → Building Templates (admin only)
- Bulk Service Life: Sidebar → Bulk Service Life (admin only)
- New Building Wizard: Available via NewBuildingWizard component

## API Endpoints (tRPC)

- `buildingTemplates.templates.*` - Template CRUD operations
- `buildingTemplates.serviceLifeValues.*` - Service life values CRUD
- `buildingTemplates.bulkUpdates.*` - Bulk update operations
