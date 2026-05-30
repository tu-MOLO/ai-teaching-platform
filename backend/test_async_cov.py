import asyncio
import pytest


async def async_hello():
    x = 1
    await asyncio.sleep(0)
    y = 2
    return x + y


def test_async_direct():
    result = asyncio.run(async_hello())
    assert result == 3


@pytest.mark.asyncio
async def test_async_with_fixture():
    result = await async_hello()
    assert result == 3
