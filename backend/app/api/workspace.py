from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas import ProjectCreate, ProjectRead

router = APIRouter(prefix="/workspace", tags=["workspace"])


@router.get("/projects", response_model=list[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all projects for the authenticated user."""
    # TODO: Implement project listing with status filtering
    pass


@router.post("/projects", response_model=ProjectRead)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create a new project."""
    # TODO: Implement project creation
    pass


@router.get("/projects/{project_id}", response_model=ProjectRead)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific project by ID."""
    # TODO: Implement project retrieval
    pass


@router.put("/projects/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str, project: ProjectCreate, db: AsyncSession = Depends(get_db)
):
    """Update an existing project."""
    # TODO: Implement project update
    pass


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project."""
    # TODO: Implement project deletion
    pass
