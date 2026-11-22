import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Tuple, Optional

from engine.preprocessing import normalize_imagenet
from schemas.request import AttackMethod

PGD_DEFAULT_ITERATIONS = 10


def generate_fgsm_perturbation(
    model: nn.Module,
    working_x: torch.Tensor,
    target_label: torch.Tensor,
    epsilon: float,
) -> torch.Tensor:
    """
    Fast Gradient Sign Method (FGSM):
    Single-step L-infinity adversarial perturbation in [0, 1] pixel space:
        delta = epsilon * sign(grad_x L(f(norm(x)), y))
    Returns perturbation delta at working resolution (1, 3, 224, 224).
    """
    x = working_x.clone().detach().requires_grad_(True)
    logits = model(normalize_imagenet(x))
    loss = F.cross_entropy(logits, target_label)

    model.zero_grad(set_to_none=True)
    loss.backward()

    grad_sign = x.grad.detach().sign()
    adv_x = torch.clamp(x.detach() + epsilon * grad_sign, 0.0, 1.0)
    delta = adv_x - working_x.detach()
    return delta


def generate_pgd_perturbation(
    model: nn.Module,
    working_x: torch.Tensor,
    target_label: torch.Tensor,
    epsilon: float,
    iterations: int = PGD_DEFAULT_ITERATIONS,
) -> Tuple[torch.Tensor, int, float]:
    """
    Projected Gradient Descent (PGD):
    Iterative L-infinity untargeted adversarial attack using 10 iterations
    and step size alpha = epsilon / 4.
    Returns (delta, iterations, step_size).
    """
    step_size = epsilon / 4.0
    x_orig = working_x.detach()
    # Initialize at the clean input (deterministic, reproducible within L-inf ball)
    x_adv = x_orig.clone().detach()

    for _ in range(iterations):
        x_adv.requires_grad_(True)
        logits = model(normalize_imagenet(x_adv))
        loss = F.cross_entropy(logits, target_label)

        model.zero_grad(set_to_none=True)
        loss.backward()

        with torch.no_grad():
            grad_sign = x_adv.grad.sign()
            x_adv = x_adv + step_size * grad_sign
            # Project perturbation onto L-infinity epsilon-ball around x_orig
            perturbation = torch.clamp(x_adv - x_orig, min=-epsilon, max=epsilon)
            # Clip to valid [0, 1] pixel range
            x_adv = torch.clamp(x_orig + perturbation, 0.0, 1.0).detach()

    delta = x_adv - x_orig
    return delta, iterations, step_size


def compute_adversarial_perturbation(
    model: nn.Module,
    working_x: torch.Tensor,
    original_class_id: int,
    attack: AttackMethod,
    epsilon: float,
) -> Tuple[torch.Tensor, Optional[int], Optional[float]]:
    """
    Dispatch to FGSM or PGD and return (perturbation_224, pgd_iterations, pgd_step_size).
    """
    target_label = torch.tensor([original_class_id], dtype=torch.long, device=working_x.device)

    if attack == AttackMethod.FGSM:
        delta = generate_fgsm_perturbation(model, working_x, target_label, epsilon)
        return delta, None, None

    if attack == AttackMethod.PGD:
        return generate_pgd_perturbation(
            model,
            working_x,
            target_label,
            epsilon,
            iterations=PGD_DEFAULT_ITERATIONS,
        )

    raise ValueError(f"Unsupported attack method: {attack}")
