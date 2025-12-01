
# backend/main.py
import os
import uuid
from datetime import datetime

from dotenv import load_dotenv  # <-- add this

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import enum


load_dotenv()  # load variables from .env into process env


DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

DEV_USER_ID_STR = os.getenv("DEV_USER_ID")
if not DEV_USER_ID_STR:
    raise RuntimeError("DEV_USER_ID is not set")

DEV_USER_ID = uuid.UUID(DEV_USER_ID_STR)



engine = create_async_engine(DATABASE_URL, echo=False, future=True)
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

DEV_USER_ID = uuid.UUID(os.getenv("DEV_USER_ID", "00000000-0000-0000-0000-000000000000"))

class BlockType(str, enum.Enum):
    text = "text"
    todo = "todo"
    table = "table"
    calendar = "calendar"


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    blocks = relationship("Block", back_populates="note", order_by="Block.position")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(BlockType, name="block_type"), nullable=False)
    position = Column(Integer, nullable=False)
    data = Column(JSONB, nullable=False, server_default="{}")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    note = relationship("Note", back_populates="blocks")


# ---------- Pydantic schemas ----------

class BlockOut(BaseModel):
    id: uuid.UUID
    type: BlockType
    position: int
    data: dict

    class Config:
        from_attributes = True


class NoteOut(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    blocks: list[BlockOut] = []

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    title: str


class BlockCreate(BaseModel):
    type: BlockType
    position: int
    data: dict = {}


class BlockUpdate(BaseModel):
    data: dict


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # You can uncomment this once to create tables if you don't use migrations:
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    pass


# ------------- Notes endpoints -------------

@app.get("/notes", response_model=list[NoteOut])
async def list_notes():
    async with async_session() as session:
        result = await session.execute(
            Note.__table__.select().where(Note.user_id == DEV_USER_ID).order_by(Note.created_at.desc())
        )
        notes_rows = result.fetchall()

        # Need to load blocks manually (simple N+1 is fine for MVP)
        notes: list[NoteOut] = []
        for row in notes_rows:
            note: Note = Note(**row._mapping)
            blocks_result = await session.execute(
                Block.__table__.select().where(Block.note_id == note.id).order_by(Block.position.asc())
            )
            blocks_rows = blocks_result.fetchall()
            note.blocks = [Block(**b._mapping) for b in blocks_rows]
            notes.append(NoteOut.model_validate(note))
        return notes

@app.post("/notes", response_model=NoteOut)
async def create_note(payload: NoteCreate):
    async with async_session() as session:
        note = Note(
            user_id=DEV_USER_ID,
            title=payload.title,
        )
        session.add(note)
        await session.flush()  # assigns note.id

        # create default block
        block = Block(
            note_id=note.id,
            type=BlockType.text,
            position=0,
            data={"text": ""},
        )
        session.add(block)

        await session.commit()
        await session.refresh(note)
        await session.refresh(block)

        # ⚠️ DO NOT do: note.blocks = [block]
        # That triggers lazy loading in an async session and causes MissingGreenlet.

        # Instead, build the response object explicitly:
        return NoteOut(
            id=note.id,
            title=note.title,
            created_at=note.created_at,
            updated_at=note.updated_at,
            blocks=[BlockOut.model_validate(block)],
        )



@app.get("/notes/{note_id}", response_model=NoteOut)
async def get_note(note_id: uuid.UUID):
    async with async_session() as session:
        note = await session.get(Note, note_id)
        if not note or note.user_id != DEV_USER_ID:
            raise HTTPException(status_code=404, detail="Note not found")

        blocks_result = await session.execute(
            Block.__table__.select().where(Block.note_id == note.id).order_by(Block.position.asc())
        )
        blocks_rows = blocks_result.fetchall()
        note.blocks = [Block(**b._mapping) for b in blocks_rows]
        return NoteOut.model_validate(note)


@app.delete("/notes/{note_id}")
async def delete_note(note_id: uuid.UUID):
    async with async_session() as session:
        note = await session.get(Note, note_id)
        if not note or note.user_id != DEV_USER_ID:
            raise HTTPException(status_code=404, detail="Note not found")
        await session.delete(note)
        await session.commit()
        return {"ok": True}


# ------------- Blocks endpoints -------------

@app.post("/notes/{note_id}/blocks", response_model=BlockOut)
async def create_block(note_id: uuid.UUID, payload: BlockCreate):
    async with async_session() as session:
        note = await session.get(Note, note_id)
        if not note or note.user_id != DEV_USER_ID:
            raise HTTPException(status_code=404, detail="Note not found")

        block = Block(
            note_id=note_id,
            type=payload.type,
            position=payload.position,
            data=payload.data,
        )
        session.add(block)
        await session.commit()
        await session.refresh(block)
        return BlockOut.model_validate(block)


@app.patch("/blocks/{block_id}", response_model=BlockOut)
async def update_block(block_id: uuid.UUID, payload: BlockUpdate):
    async with async_session() as session:
        block = await session.get(Block, block_id)
        if not block:
            raise HTTPException(status_code=404, detail="Block not found")

        block.data = payload.data
        await session.commit()
        await session.refresh(block)
        return BlockOut.model_validate(block)


@app.delete("/blocks/{block_id}")
async def delete_block(block_id: uuid.UUID):
    async with async_session() as session:
        block = await session.get(Block, block_id)
        if not block:
            raise HTTPException(status_code=404, detail="Block not found")
        await session.delete(block)
        await session.commit()
        return {"ok": True}
