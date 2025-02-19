"""Time-related utilities for Ethereum networks."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple

class WallClock:
    """Handles time-related calculations for Ethereum networks."""

    SLOTS_PER_EPOCH = 32

    def __init__(self, genesis_time: int, seconds_per_slot: int):
        """Initialize wall clock.
        
        Args:
            genesis_time: Unix timestamp of network genesis
            seconds_per_slot: Number of seconds per slot
        """
        self.genesis_time = datetime.fromtimestamp(genesis_time, tz=timezone.utc)
        self.seconds_per_slot = seconds_per_slot

    def get_current_slot(self) -> int:
        """Get current slot number."""
        return self.time_to_slot(datetime.now(timezone.utc))

    def get_current_epoch(self) -> int:
        """Get current epoch number."""
        return self.get_current_slot() // self.SLOTS_PER_EPOCH

    def time_to_slot(self, time: datetime) -> int:
        """Convert datetime to slot number."""
        if time < self.genesis_time:
            return 0
        delta = time - self.genesis_time
        return int(delta.total_seconds() // self.seconds_per_slot)

    def time_to_epoch(self, time: datetime) -> int:
        """Convert datetime to epoch number."""
        return self.time_to_slot(time) // self.SLOTS_PER_EPOCH

    def slot_to_time(self, slot: int) -> datetime:
        """Convert slot number to datetime.
        
        Returns the start time of the slot.
        """
        return self.genesis_time + timedelta(seconds=slot * self.seconds_per_slot)

    def epoch_to_time(self, epoch: int) -> datetime:
        """Convert epoch number to datetime.
        
        Returns the start time of the epoch.
        """
        return self.slot_to_time(epoch * self.SLOTS_PER_EPOCH)

    def slot_in_epoch(self, slot: int) -> int:
        """Get the slot number within its epoch (0-31)."""
        return slot % self.SLOTS_PER_EPOCH

    def epoch_start_slot(self, epoch: int) -> int:
        """Get the first slot number of the given epoch."""
        return epoch * self.SLOTS_PER_EPOCH

    def epoch_end_slot(self, epoch: int) -> int:
        """Get the last slot number of the given epoch."""
        return (epoch + 1) * self.SLOTS_PER_EPOCH - 1

    def is_slot_in_epoch(self, slot: int, epoch: int) -> bool:
        """Check if a slot is within the given epoch."""
        start_slot = self.epoch_start_slot(epoch)
        end_slot = self.epoch_end_slot(epoch)
        return start_slot <= slot <= end_slot

    def time_until_slot(self, slot: int) -> timedelta:
        """Get time until the given slot.
        
        Returns:
            Time until slot (negative if slot is in the past)
        """
        slot_time = self.slot_to_time(slot)
        current_time = datetime.now(timezone.utc)
        return slot_time - current_time

    def time_until_epoch(self, epoch: int) -> timedelta:
        """Get time until the given epoch.
        
        Returns:
            Time until epoch (negative if epoch is in the past)
        """
        return self.time_until_slot(self.epoch_start_slot(epoch))

    def is_current_slot(self, slot: int) -> bool:
        """Check if the given slot is the current slot."""
        return slot == self.get_current_slot()

    def is_current_epoch(self, epoch: int) -> bool:
        """Check if the given epoch is the current epoch."""
        return epoch == self.get_current_epoch()

    def is_slot_in_future(self, slot: int) -> bool:
        """Check if the given slot is in the future."""
        return slot > self.get_current_slot()

    def is_epoch_in_future(self, epoch: int) -> bool:
        """Check if the given epoch is in the future."""
        return epoch > self.get_current_epoch()

    def get_slot_start_time(self, slot: int) -> datetime:
        """Get the start time of a slot."""
        return self.slot_to_time(slot)

    def get_slot_end_time(self, slot: int) -> datetime:
        """Get the end time of a slot."""
        return self.slot_to_time(slot + 1)

    def get_slot_progress(self, slot: int) -> float:
        """Get the progress through the current slot as a percentage (0-100)."""
        if not self.is_current_slot(slot):
            return 100.0 if slot < self.get_current_slot() else 0.0
        
        start_time = self.get_slot_start_time(slot)
        now = datetime.now(timezone.utc)
        elapsed = (now - start_time).total_seconds()
        return min(100.0, (elapsed / self.seconds_per_slot) * 100)

    def get_epoch_progress(self, epoch: int) -> float:
        """Get the progress through the current epoch as a percentage (0-100)."""
        if not self.is_current_epoch(epoch):
            return 100.0 if epoch < self.get_current_epoch() else 0.0
        
        start_slot = self.epoch_start_slot(epoch)
        current_slot = self.get_current_slot()
        slot_progress = self.get_slot_progress(current_slot)
        
        slots_elapsed = current_slot - start_slot
        return min(100.0, (slots_elapsed * 100 + slot_progress) / self.SLOTS_PER_EPOCH) 
    def get_slot_window(self, slot: int) -> Tuple[datetime, datetime]:
        """Get the start and end times of a slot window."""
        start_time = self.slot_to_time(slot)
        end_time = start_time + timedelta(seconds=self.seconds_per_slot)
        return start_time, end_time
    def get_epoch_window(self, epoch: int) -> Tuple[datetime, datetime]:
        """Get the start and end times of an epoch window."""
        start_time = self.epoch_to_time(epoch)
        end_time = start_time + timedelta(seconds=self.seconds_per_slot * self.SLOTS_PER_EPOCH)
        return start_time, end_time
